export const metadata = {
  title: 'Viral Shorts Agent',
  description: 'Find viral scripts and auto-generate vertical videos with TTS',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Inter, Arial', background: '#0b0b0b', color: '#eaeaea' }}>
        {children}
      </body>
    </html>
  );
}
