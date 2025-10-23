export const metadata = {
  title: 'USDT/VES Backend',
  description: 'API y backend serverless para el exchange USDT⇄VES',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
