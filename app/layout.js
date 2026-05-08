import { Inter } from "next/font/google";
import Navbar from "./components/Navbar";
import { LeagueProvider } from "./components/LeagueContext";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata = {
  title: "Fantaborsa – Il tuo portafoglio virtuale",
  description: "Fantaborsa: investi, partecipa alle leghe e monitora il tuo portfolio in tempo reale.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body className={`${inter.variable} antialiased`}>
        <LeagueProvider>
          <Navbar />
          {children}
        </LeagueProvider>
      </body>
    </html>
  );
}
