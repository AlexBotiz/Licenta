import "./globals.css";

export const metadata = {
  title: "LMS Licenta",
  description: "Platforma de cursuri cu AI",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}