export default function Home() {
  return (
    <main style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '720px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#ab3500' }}>Tindivo API</h1>
      <p style={{ color: '#594139' }}>
        Backend REST del ecosistema Tindivo. Endpoints disponibles en{' '}
        <code>/api/v1/*</code>.
      </p>
      <ul style={{ marginTop: '1.5rem', lineHeight: '2', color: '#1a1c1b' }}>
        <li>
          <code>GET /api/v1/health</code> — health check
        </li>
        <li>
          <code>POST /api/v1/restaurant/orders</code> — crear pedido
        </li>
        <li>
          <code>GET /api/v1/driver/orders/available</code> — pedidos disponibles
        </li>
        <li>
          <code>GET /api/v1/tracking/:shortId</code> — tracking público
        </li>
      </ul>
    </main>
  )
}
