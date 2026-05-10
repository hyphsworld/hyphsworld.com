import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Menu from "@/pages/Menu";
import GamePage from "@/pages/Game";
import Leaderboard from "@/pages/Leaderboard";
import HowToPlay from "@/pages/HowToPlay";
import { Toaster } from "sonner";

function App() {
    return (
        <div className="App">
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Menu />} />
                    <Route path="/play" element={<GamePage />} />
                    <Route path="/leaderboard" element={<Leaderboard />} />
                    <Route path="/how-to-play" element={<HowToPlay />} />
                </Routes>
            </BrowserRouter>
            <Toaster richColors position="top-center" />
        </div>
    );
}

export default App;
