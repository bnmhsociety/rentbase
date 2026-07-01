import "./globals.css";

export const metadata = {
  title: "RentBase",
  description: "Site public de réservation RentBase",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
