import { useRoute } from "./router";
import { Dashboard } from "./pages/Dashboard";
import { BookingsPage } from "./pages/BookingsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { BookingPage } from "./pages/BookingPage";
import { NavBar } from "./components/NavBar";

export default function App() {
  const route = useRoute();

  // Public booking page is shown without the host chrome.
  if (route.startsWith("/book/")) {
    const slug = route.slice("/book/".length);
    return <BookingPage slug={slug} />;
  }

  let page;
  switch (route) {
    case "/bookings":
      page = <BookingsPage />;
      break;
    case "/settings":
      page = <SettingsPage />;
      break;
    default:
      page = <Dashboard />;
  }

  return (
    <div className="app">
      <NavBar route={route} />
      <main className="main">{page}</main>
    </div>
  );
}
