import { Icon } from '@tindivo/ui'

type Props = {
  title: string
  description: string
  icon: string
}

export function ComingSoon({ title, description, icon }: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center max-w-md mx-auto">
      <div
        className="inline-flex items-center justify-center mb-6"
        style={{
          width: '88px',
          height: '88px',
          borderRadius: '28px',
          background:
            'linear-gradient(135deg, rgba(255, 107, 53, 0.14) 0%, rgba(255, 140, 66, 0.08) 100%)',
          color: '#AB3500',
        }}
      >
        <Icon name={icon} size={44} filled />
      </div>
      <h1
        className="bleed-text font-black text-3xl text-on-surface mb-2"
        style={{ letterSpacing: '-0.02em' }}
      >
        {title}
      </h1>
      <p className="text-on-surface-variant leading-snug">{description}</p>
      <div
        className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-[0.18em] uppercase"
        style={{
          background: 'rgba(255, 107, 53, 0.1)',
          color: '#AB3500',
          border: '1px solid rgba(255, 107, 53, 0.25)',
        }}
      >
        <Icon name="construction" size={12} filled />
        En desarrollo
      </div>
    </div>
  )
}
