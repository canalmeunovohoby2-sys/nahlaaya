import {
  corsHeaders,
  handleOptions,
  HttpError,
  jsonResponse,
} from '../_shared/http.ts'
import { getServiceClient, requireAdmin } from '../_shared/supabase.ts'
import {
  applyShippingFields,
  readOptionalPositiveInteger,
  type ProductShippingInput,
} from '../_shared/product-shipping.ts'

interface RelatedCustomer {
  full_name: string
  email: string
  phone?: string
  cpf?: string
}

interface RelatedAddress {
  cep: string
  street: string
  number: string
  complement: string
  neighborhood: string
  city: string
  state: string
}

function orderListItem(order: Record<string, unknown>) {
  const customer = order.customers as RelatedCustomer | null

  return {
    id: order.id,
    order_number: order.order_number,
    payment_method: order.payment_method,
    total_cents: order.total_cents,
    payment_status: order.payment_status,
    delivery_status: order.delivery_status,
    created_at: order.created_at,
    customer_name: customer?.full_name ?? '',
    customer_email: customer?.email ?? '',
  }
}

function mapProduct(product: Record<string, unknown>) {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    volumeMl: product.volume_ml,
    weightGrams: product.weight_grams ?? null,
    lengthCm: product.length_cm ?? null,
    widthCm: product.width_cm ?? null,
    heightCm: product.height_cm ?? null,
    concentration: product.concentration,
    description: product.description ?? '',
    pixPriceCents: product.pix_price_cents,
    debitPriceCents: product.debit_price_cents,
    installmentTotalCents: product.installment_total_cents,
    stock: product.stock,
    active: product.active,
    category: product.category,
    images: product.images ?? [],
    updatedAt: product.updated_at,
  }
}

const PRODUCT_IMAGE_BUCKET = 'product-images'
const MAX_PRODUCT_IMAGE_BYTES = 2 * 1024 * 1024

interface ProductImageInput {
  base64: string
  contentType: string
}

interface ProductInput extends ProductShippingInput {
  name: string
  brand: string
  volumeMl: number
  concentration: string
  description: string
  category: 'masculino' | 'feminino'
  priceCents: number
  stock: number
  active: boolean
  image: ProductImageInput | null
}

function readProductInput(body: unknown): ProductInput {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new HttpError(400, 'Dados do produto inválidos.')
  }

  const value = body as Record<string, unknown>
  const name = typeof value.name === 'string' ? value.name.trim() : ''
  const brand = typeof value.brand === 'string' ? value.brand.trim() : ''
  const concentration =
    typeof value.concentration === 'string' ? value.concentration.trim() : ''
  const category =
    value.category === 'masculino' || value.category === 'feminino'
      ? value.category
      : null
  const description =
    typeof value.description === 'string' ? value.description.trim() : ''
  const volumeMl = Number(value.volumeMl)
  const weightGrams = readOptionalPositiveInteger(value.weightGrams, 'Peso')
  const lengthCm = readOptionalPositiveInteger(value.lengthCm, 'Comprimento')
  const widthCm = readOptionalPositiveInteger(value.widthCm, 'Largura')
  const heightCm = readOptionalPositiveInteger(value.heightCm, 'Altura')
  const priceCents = Number(value.priceCents)
  const stock = Number(value.stock)
  const active = typeof value.active === 'boolean' ? value.active : true

  if (!name || !brand || !concentration) {
    throw new HttpError(400, 'Nome, marca e concentração são obrigatórios.')
  }

  if (!category) {
    throw new HttpError(400, 'Selecione a categoria do perfume.')
  }

  if (!Number.isSafeInteger(volumeMl) || volumeMl <= 0) {
    throw new HttpError(400, 'Volume inválido.')
  }

  if (!Number.isSafeInteger(priceCents) || priceCents <= 0) {
    throw new HttpError(400, 'Preço inválido.')
  }

  if (!Number.isSafeInteger(stock) || stock < 0) {
    throw new HttpError(400, 'Estoque inválido.')
  }

  let image: ProductImageInput | null = null

  if (value.image !== undefined && value.image !== null) {
    const candidate = value.image as Record<string, unknown>
    const base64 =
      typeof candidate.base64 === 'string' ? candidate.base64.trim() : ''
    const contentType =
      typeof candidate.contentType === 'string'
        ? candidate.contentType.trim().toLowerCase()
        : ''

    if (!base64 || !['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) {
      throw new HttpError(400, 'Imagem inválida. Use JPG, PNG ou WebP.')
    }

    image = { base64, contentType }
  }

  return {
    name,
    brand,
    concentration,
    description,
    category,
    volumeMl,
    weightGrams,
    lengthCm,
    widthCm,
    heightCm,
    priceCents,
    stock,
    active,
    image,
  }
}

function slugifyProductName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

async function uniqueProductSlug(
  client: ReturnType<typeof getServiceClient>,
  name: string,
): Promise<string> {
  const base = slugifyProductName(name) || 'produto-' + crypto.randomUUID()
  let slug = base
  let suffix = 2

  while (true) {
    const { data } = await client
      .from('products')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (!data) {
      return slug
    }

    slug = base + '-' + suffix
    suffix += 1
  }
}

async function uploadProductImage(
  client: ReturnType<typeof getServiceClient>,
  image: ProductImageInput,
): Promise<string> {
  const extension =
    image.contentType === 'image/png'
      ? 'png'
      : image.contentType === 'image/webp'
        ? 'webp'
        : 'jpg'
  const cleanBase64 = image.base64.includes(',')
    ? image.base64.slice(image.base64.indexOf(',') + 1)
    : image.base64

  let bytes: Uint8Array

  try {
    bytes = Uint8Array.from(atob(cleanBase64), (char) => char.charCodeAt(0))
  } catch {
    throw new HttpError(400, 'Não foi possível ler a imagem enviada.')
  }

  if (bytes.byteLength > MAX_PRODUCT_IMAGE_BYTES) {
    throw new HttpError(413, 'A imagem deve ter no máximo 2 MB.')
  }

  const path = 'products/' + crypto.randomUUID() + '.' + extension
  const { error } = await client.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(path, bytes, {
      contentType: image.contentType,
      cacheControl: '31536000',
      upsert: false,
    })

  if (error) {
    throw new HttpError(500, 'Não foi possível enviar a imagem.')
  }

  const { data } = client.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .getPublicUrl(path)

  return data.publicUrl
}

async function removeProductImage(
  client: ReturnType<typeof getServiceClient>,
  imageUrl: string,
): Promise<void> {
  const marker = '/storage/v1/object/public/' + PRODUCT_IMAGE_BUCKET + '/'
  const markerIndex = imageUrl.indexOf(marker)

  if (markerIndex < 0) {
    return
  }

  const path = decodeURIComponent(
    imageUrl.slice(markerIndex + marker.length).split('?')[0],
  )

  await client.storage.from(PRODUCT_IMAGE_BUCKET).remove([path])
}

function productWritePayload(input: ProductInput, imageUrl: string | null) {
  const payload: Record<string, unknown> = {
    name: input.name,
    brand: input.brand,
    volume_ml: input.volumeMl,
    concentration: input.concentration,
    description: input.description,
    category: input.category,
    pix_price_cents: Math.round(input.priceCents * 0.9),
    debit_price_cents: Math.round(input.priceCents / 1.1),
    installment_total_cents: input.priceCents,
    stock: input.stock,
    active: input.active,
    images: imageUrl ? [imageUrl] : [],
  }

  return applyShippingFields(payload, input)
}

function mapOrderDetail(order: Record<string, unknown>) {
  const customer = order.customers as RelatedCustomer | null
  const address = order.addresses as RelatedAddress | null
  const items = (order.order_items ?? []) as Record<string, unknown>[]

  return {
    ...order,
    customer_name: customer?.full_name ?? '',
    customer_email: customer?.email ?? '',
    customer_phone: customer?.phone ?? '',
    customer_cpf: customer?.cpf ?? '',
    cep: address?.cep ?? '',
    street: address?.street ?? '',
    number: address?.number ?? '',
    complement: address?.complement ?? '',
    neighborhood: address?.neighborhood ?? '',
    city: address?.city ?? '',
    state: address?.state ?? '',
    items,
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return handleOptions(request)
  }

  const headers = corsHeaders(request)

  try {
    await requireAdmin(request)
    const url = new URL(request.url)
    const action = url.searchParams.get('action')
    const client = getServiceClient()

    if (request.method === 'GET' && action === 'dashboard') {
      const { data, error } = await client
        .from('orders')
        .select('*, customers(full_name,email), order_items(quantity)')
        .order('created_at', { ascending: false })

      if (error) throw new HttpError(500, error.message)

      const orders = (data ?? []) as Record<string, unknown>[]
      const paid = orders.filter((order) => order.payment_status === 'paid')
      const cancelled = orders.filter(
        (order) =>
          order.payment_status === 'cancelled' ||
          order.delivery_status === 'cancelled',
      )

      return jsonResponse(
        {
          revenueCents: paid.reduce(
            (total, order) => total + Number(order.total_cents),
            0,
          ),
          pendingPaymentCount: orders.filter(
            (order) =>
              order.payment_status === 'pending' &&
              order.delivery_status !== 'cancelled',
          ).length,
          paidOrderCount: paid.length,
          cancelledOrderCount: cancelled.length,
          soldItemCount: paid.reduce((total, order) => {
            const items = (order.order_items ?? []) as { quantity: number }[]
            return (
              total +
              items.reduce((sum, item) => sum + Number(item.quantity), 0)
            )
          }, 0),
          recentOrders: orders.slice(0, 8).map(orderListItem),
        },
        200,
        headers,
      )
    }

    if (request.method === 'GET' && action === 'visits') {
      const { data, error } = await client.rpc('get_visit_stats')

      if (error) throw new HttpError(500, error.message)
      if (!data) throw new HttpError(500, 'Estatísticas de visitas indisponíveis.')

      return jsonResponse(data, 200, headers)
    }

    if (request.method === 'GET' && action === 'expired-reservations') {
      const { data, error } = await client.rpc('get_expired_order_reservations')

      if (error) throw new HttpError(500, error.message)

      return jsonResponse(data ?? [], 200, headers)
    }

    if (request.method === 'PATCH' && action === 'release-expired') {
      const { data, error } = await client.rpc(
        'release_expired_order_reservations',
      )

      if (error) throw new HttpError(500, error.message)

      return jsonResponse({ released: Number(data ?? 0) }, 200, headers)
    }

    if (request.method === 'GET' && action === 'melhor-envio-status') {
      const { data, error } = await client
        .from('integration_connections')
        .select('account_id,account_name,token_expires_at,needs_reconnect,connected_at,scope')
        .eq('provider', 'melhor_envio')
        .maybeSingle()

      if (error) throw new HttpError(500, error.message)

      return jsonResponse(
        {
          connected: Boolean(data),
          accountId: data?.account_id ?? null,
          accountName: data?.account_name ?? null,
          expiresAt: data?.token_expires_at ?? null,
          needsReconnect: data?.needs_reconnect ?? false,
          connectedAt: data?.connected_at ?? null,
          scope: data?.scope ?? null,
        },
        200,
        headers,
      )
    }

    if (request.method === 'PATCH' && action === 'melhor-envio-disconnect') {
      const { error } = await client
        .from('integration_connections')
        .delete()
        .eq('provider', 'melhor_envio')

      if (error) throw new HttpError(500, error.message)

      return jsonResponse({ disconnected: true }, 200, headers)
    }

    if (request.method === 'GET' && action === 'shipping-settings') {
      const { data, error } = await client
        .from('shipping_settings')
        .select(
          'origin_cep,perfume_weight_grams,box_weight_grams,box_length_cm,box_width_cm,box_height_cm,max_perfumes_per_box',
        )
        .eq('id', true)
        .maybeSingle()

      if (error) throw new HttpError(500, error.message)

      return jsonResponse(
        {
          originCep: data?.origin_cep ?? null,
          perfumeWeightGrams: data?.perfume_weight_grams ?? null,
          boxWeightGrams: data?.box_weight_grams ?? null,
          boxLengthCm: data?.box_length_cm ?? null,
          boxWidthCm: data?.box_width_cm ?? null,
          boxHeightCm: data?.box_height_cm ?? null,
          maxPerfumesPerBox: data?.max_perfumes_per_box ?? null,
        },
        200,
        headers,
      )
    }

    if (request.method === 'PATCH' && action === 'shipping-settings') {
      const body = await request.json()

      if (typeof body !== 'object' || body === null || Array.isArray(body)) {
        throw new HttpError(400, 'Configuração de envio inválida.')
      }

      const input = body as Record<string, unknown>
      const { data: existing, error: readError } = await client
        .from('shipping_settings')
        .select('*')
        .eq('id', true)
        .maybeSingle()

      if (readError) throw new HttpError(500, readError.message)

      const updates: Record<string, unknown> = {
        id: true,
        updated_at: new Date().toISOString(),
      }

      function has(key: string): boolean {
        return Object.prototype.hasOwnProperty.call(input, key)
      }

      if (has('originCep')) {
        if (input.originCep !== null && typeof input.originCep !== 'string') {
          throw new HttpError(400, 'CEP de origem inválido.')
        }

        const rawCep =
          typeof input.originCep === 'string'
            ? input.originCep.replace(/\D/g, '')
            : ''

        if (rawCep && !/^[0-9]{8}$/.test(rawCep)) {
          throw new HttpError(400, 'Informe um CEP de origem com 8 dígitos.')
        }

        updates.origin_cep = rawCep || null
      } else {
        updates.origin_cep = existing?.origin_cep ?? null
      }

      const fields: [string, string, string][] = [
        ['perfumeWeightGrams', 'perfume_weight_grams', 'Peso do perfume'],
        ['boxWeightGrams', 'box_weight_grams', 'Peso da caixa'],
        ['boxLengthCm', 'box_length_cm', 'Comprimento da caixa'],
        ['boxWidthCm', 'box_width_cm', 'Largura da caixa'],
        ['boxHeightCm', 'box_height_cm', 'Altura da caixa'],
        ['maxPerfumesPerBox', 'max_perfumes_per_box', 'Máximo por caixa'],
      ]

      for (const [inputKey, column, label] of fields) {
        if (has(inputKey)) {
          const parsed = readOptionalPositiveInteger(input[inputKey], label)
          if (parsed !== undefined) updates[column] = parsed
        } else {
          updates[column] = existing?.[column] ?? null
        }
      }

      const { data, error } = await client
        .from('shipping_settings')
        .upsert(updates, { onConflict: 'id' })
        .select(
          'origin_cep,perfume_weight_grams,box_weight_grams,box_length_cm,box_width_cm,box_height_cm,max_perfumes_per_box',
        )
        .single()

      if (error) throw new HttpError(500, error.message)

      return jsonResponse(
        {
          originCep: data?.origin_cep ?? null,
          perfumeWeightGrams: data?.perfume_weight_grams ?? null,
          boxWeightGrams: data?.box_weight_grams ?? null,
          boxLengthCm: data?.box_length_cm ?? null,
          boxWidthCm: data?.box_width_cm ?? null,
          boxHeightCm: data?.box_height_cm ?? null,
          maxPerfumesPerBox: data?.max_perfumes_per_box ?? null,
        },
        200,
        headers,
      )
    }

    if (request.method === 'POST' && action === 'products') {
      const body = await request.json()
      const input = readProductInput(body)
      const slug = await uniqueProductSlug(client, input.name)
      const id = crypto.randomUUID()
      let imageUrl: string | null = null

      try {
        if (input.image) {
          imageUrl = await uploadProductImage(client, input.image)
        }

        const { data, error } = await client
          .from('products')
          .insert({
            id,
            slug,
            ...productWritePayload(input, imageUrl),
          })
          .select('*')
          .single()

        if (error) {
          if (imageUrl) {
            await removeProductImage(client, imageUrl)
          }
          throw new HttpError(500, error.message)
        }

        return jsonResponse({ product: mapProduct(data) }, 201, headers)
      } catch (error) {
        if (imageUrl && !(error instanceof HttpError && error.status === 500)) {
          await removeProductImage(client, imageUrl)
        }
        throw error
      }
    }

    if (request.method === 'PATCH' && action === 'products') {
      const id = url.searchParams.get('id')

      if (!id) {
        throw new HttpError(400, 'Produto inválido.')
      }

      const { data: existing, error: existingError } = await client
        .from('products')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (existingError) throw new HttpError(500, existingError.message)
      if (!existing) throw new HttpError(404, 'Produto não encontrado.')

      const body = await request.json()
      const input = readProductInput(body)
      let imageUrl: string | null = null
      let uploadedImageUrl: string | null = null

      if (input.image) {
        uploadedImageUrl = await uploadProductImage(client, input.image)
        imageUrl = uploadedImageUrl
      } else {
        const existingImages = Array.isArray(existing.images) ? existing.images : []
        imageUrl = typeof existingImages[0] === 'string' ? existingImages[0] : null
      }

      const payload = {
        ...productWritePayload(input, imageUrl),
        images: imageUrl ? [imageUrl] : [],
      }

      const { data, error } = await client
        .from('products')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single()

      if (error) {
        if (uploadedImageUrl) {
          await removeProductImage(client, uploadedImageUrl)
        }
        throw new HttpError(500, error.message)
      }

      if (uploadedImageUrl) {
        const oldImages = Array.isArray(existing.images) ? existing.images : []
        const oldImage = typeof oldImages[0] === 'string' ? oldImages[0] : null

        if (oldImage && oldImage !== uploadedImageUrl) {
          await removeProductImage(client, oldImage)
        }
      }

      return jsonResponse({ product: mapProduct(data) }, 200, headers)
    }

    if (request.method === 'DELETE' && action === 'products') {
      const id = url.searchParams.get('id')

      if (!id) {
        throw new HttpError(400, 'Produto inválido.')
      }

      const { data: existing, error: existingError } = await client
        .from('products')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (existingError) throw new HttpError(500, existingError.message)
      if (!existing) throw new HttpError(404, 'Produto não encontrado.')

      const { error } = await client.from('products').delete().eq('id', id)

      if (error) {
        throw new HttpError(
          409,
          'Não foi possível excluir. O produto pode estar vinculado a pedidos.',
        )
      }

      const images = Array.isArray(existing.images) ? existing.images : []
      const image = typeof images[0] === 'string' ? images[0] : null

      if (image) {
        await removeProductImage(client, image)
      }

      return jsonResponse({ deleted: true }, 200, headers)
    }

    if (request.method === 'GET' && action === 'products') {
      const { data, error } = await client
        .from('products')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw new HttpError(500, error.message)
      return jsonResponse(
        { products: (data ?? []).map(mapProduct) },
        200,
        headers,
      )
    }

    if (request.method === 'PATCH' && action === 'product') {
      const body = await request.json()
      const id = url.searchParams.get('id')

      if (!id) throw new HttpError(400, 'Produto inválido.')

      const updates: Record<string, unknown> = {}

      if (body.stock !== undefined) {
        if (!Number.isSafeInteger(body.stock) || body.stock < 0) {
          throw new HttpError(400, 'Estoque inválido.')
        }
        updates.stock = body.stock
      }

      if (body.active !== undefined) {
        if (typeof body.active !== 'boolean') {
          throw new HttpError(400, 'Situação inválida.')
        }
        updates.active = body.active
      }

      if (Object.keys(updates).length === 0) {
        throw new HttpError(400, 'Nenhuma alteração informada.')
      }

      const { data, error } = await client
        .from('products')
        .update(updates)
        .eq('id', id)
        .select('*')
        .maybeSingle()

      if (error) throw new HttpError(500, error.message)
      if (!data) throw new HttpError(404, 'Produto não encontrado.')

      return jsonResponse({ product: mapProduct(data) }, 200, headers)
    }

    if (request.method === 'GET' && action === 'orders') {
      const { data, error } = await client
        .from('orders')
        .select('*, customers(full_name,email)')
        .order('created_at', { ascending: false })
        .limit(200)

      if (error) throw new HttpError(500, error.message)
      return jsonResponse(
        { orders: (data ?? []).map(orderListItem) },
        200,
        headers,
      )
    }

    if (request.method === 'GET' && action === 'order') {
      const id = Number(url.searchParams.get('id'))

      if (!Number.isSafeInteger(id) || id <= 0) {
        throw new HttpError(400, 'Pedido inválido.')
      }

      const { data, error } = await client
        .from('orders')
        .select('*, customers(*), addresses(*), order_items(*)')
        .eq('id', id)
        .maybeSingle()

      if (error) throw new HttpError(500, error.message)
      if (!data) throw new HttpError(404, 'Pedido não encontrado.')

      return jsonResponse(
        { order: mapOrderDetail(data as Record<string, unknown>) },
        200,
        headers,
      )
    }

    if (request.method === 'GET' && action === 'customers') {
      const [{ data: customers, error: customersError }, { data: orders, error: ordersError }] =
        await Promise.all([
          client.from('customers').select('*').order('created_at', { ascending: false }),
          client.from('orders').select('customer_id,payment_status,total_cents'),
        ])

      if (customersError || ordersError) {
        throw new HttpError(500, customersError?.message ?? ordersError?.message ?? 'Erro.')
      }

      const orderRows = (orders ?? []) as Record<string, unknown>[]

      return jsonResponse(
        {
          customers: (customers ?? []).map((customer) => {
            const customerOrders = orderRows.filter(
              (order) => order.customer_id === customer.id,
            )
            return {
              ...customer,
              order_count: customerOrders.length,
              paid_total_cents: customerOrders
                .filter((order) => order.payment_status === 'paid')
                .reduce((total, order) => total + Number(order.total_cents), 0),
            }
          }),
        },
        200,
        headers,
      )
    }

    if (request.method === 'PATCH' && action === 'payment') {
      const id = Number(url.searchParams.get('id'))
      const body = await request.json()

      if (!Number.isSafeInteger(id) || id <= 0) {
        throw new HttpError(400, 'Pedido inválido.')
      }

      if (!['pending', 'paid', 'cancelled'].includes(String(body.status))) {
        throw new HttpError(400, 'Status inválido.')
      }

      if (body.status === 'paid') {
        const { data, error } = await client.rpc('confirm_order_payment', {
          p_order_id: id,
          p_provider: 'manual',
          p_reference: `manual-${id}`,
        })
        if (error) throw new HttpError(409, error.message)

        const result = data as { reservationExpired?: boolean } | null

        if (result?.reservationExpired) {
          throw new HttpError(
            409,
            'Reserva de estoque expirada. O pedido foi cancelado e o estoque liberado.',
          )
        }

        const { data: detail, error: detailError } = await client
          .from('orders')
          .select('*, customers(*), addresses(*), order_items(*)')
          .eq('id', id)
          .maybeSingle()

        if (detailError) throw new HttpError(500, detailError.message)
        if (!detail) throw new HttpError(404, 'Pedido não encontrado.')

        return jsonResponse(
          { order: mapOrderDetail(detail as Record<string, unknown>) },
          200,
          headers,
        )
      }

      const { data, error } = await client
        .from('orders')
        .update({
          payment_status: body.status,
          cancelled_at: body.status === 'cancelled' ? new Date().toISOString() : null,
        })
        .eq('id', id)
        .eq('payment_status', 'pending')
        .select('*, customers(*), addresses(*), order_items(*)')
        .maybeSingle()

      if (error) throw new HttpError(500, error.message)
      if (!data) throw new HttpError(409, 'Pedido não pode ser alterado.')

      return jsonResponse(
        { order: mapOrderDetail(data as Record<string, unknown>) },
        200,
        headers,
      )
    }

    if (request.method === 'PATCH' && action === 'delivery') {
      const id = Number(url.searchParams.get('id'))
      const body = await request.json()

      if (!Number.isSafeInteger(id) || id <= 0) {
        throw new HttpError(400, 'Pedido inválido.')
      }

      if (
        !['pending', 'preparing', 'shipped', 'delivered', 'cancelled'].includes(
          String(body.status),
        )
      ) {
        throw new HttpError(400, 'Status inválido.')
      }

      const { data, error } = await client
        .from('orders')
        .update({ delivery_status: body.status })
        .eq('id', id)
        .select('*, customers(*), addresses(*), order_items(*)')
        .maybeSingle()

      if (error) throw new HttpError(500, error.message)
      if (!data) throw new HttpError(404, 'Pedido não encontrado.')

      return jsonResponse(
        { order: mapOrderDetail(data as Record<string, unknown>) },
        200,
        headers,
      )
    }

    throw new HttpError(404, 'Ação administrativa não encontrada.')
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500
    const message =
      error instanceof Error ? error.message : 'Erro administrativo.'

    return jsonResponse({ message }, status, headers)
  }
})
