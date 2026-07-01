import "./globals.css";

export const metadata = {
  title: "RentBase",
  description: "Réservation automobile en ligne",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
