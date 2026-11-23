import { WhatsAppIcon } from '../icons/Icons'
import { buildAdminWhatsAppContact } from '../../admin/whatsapp'

interface AdminWhatsAppLinkProps {
  customerName: string
  phone: string
  compact?: boolean
}

export function AdminWhatsAppLink({
  customerName,
  phone,
  compact = false,
}: AdminWhatsAppLinkProps) {
  const contact = buildAdminWhatsAppContact(customerName, phone)

  if (!contact) {
    return (
      <span className="admin-whatsapp admin-whatsapp--missing">
        WhatsApp não informado
      </span>
    )
  }

  return (
    <div className={`admin-whatsapp${compact ? ' admin-whatsapp--compact' : ''}`}>
      <a
        className="admin-whatsapp__number"
        href={contact.url}
        target="_blank"
        rel="noreferrer"
      >
        {contact.display}
      </a>
      <a
        className="admin-whatsapp__button"
        href={contact.url}
        target="_blank"
        rel="noreferrer"
      >
        <WhatsAppIcon width={15} height={15} />
        Chamar no WhatsApp
      </a>
    </div>
  )
}
