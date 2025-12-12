import Home from './pages/Home';
import Explore from './pages/Explore';
import Reels from './pages/Reels';
import Communities from './pages/Communities';
import Marketplace from './pages/Marketplace';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Explore": Explore,
    "Reels": Reels,
    "Communities": Communities,
    "Marketplace": Marketplace,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};