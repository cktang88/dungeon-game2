import { Link, Route, Switch } from "wouter";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { useUserName } from "./hooks/useUserName";
import { UserNameModal } from "./components/UserNameModal";
import { GamePage } from "./features/game/GamePage";
import "./App.css";

function App() {
  const { userName, setUserName, isModalOpen, setIsModalOpen, clearUserName } =
    useUserName();

  return (
    <div className="min-h-screen bg-background font-sans antialiased">
      <header className="container mx-auto py-4">
        <nav className="flex justify-between items-center">
          <Link href="/">
            <a className="text-2xl font-bold text-primary hover:text-primary/80 transition-colors">
              Dungeon Crawler
            </a>
          </Link>
          {userName && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {userName}
              </span>
              <Button variant="outline" size="sm" onClick={clearUserName}>
                Change Character
              </Button>
            </div>
          )}
        </nav>
      </header>

      <main>
        <Switch>
          <Route
            path="/"
            component={() => userName ? <GamePage playerName={userName} /> : null}
          />
          <Route>
            <div className="container mx-auto py-4 text-center">
              <h1 className="text-4xl font-bold mb-4">404 - Lost in the Dungeon</h1>
              <Button asChild>
                <Link href="/">Return to Safety</Link>
              </Button>
            </div>
          </Route>
        </Switch>
      </main>

      <footer className="container mx-auto py-4 mt-8 text-center text-muted-foreground">
        <p>
          &copy; {new Date().getFullYear()} Dungeon Crawler. Powered by Cloudflare & Gemini.
        </p>
      </footer>
      <Toaster richColors />
      <UserNameModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        onNameSubmit={setUserName}
      />
    </div>
  );
}

export default App;