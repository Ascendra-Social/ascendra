import Home from './pages/Home';
import Explore from './pages/Explore';
import Reels from './pages/Reels';
import Communities from './pages/Communities';
import Marketplace from './pages/Marketplace';
import Messages from './pages/Messages';
import Wallet from './pages/Wallet';
import Profile from './pages/Profile';
import CommunityDetail from './pages/CommunityDetail';
import CreatePost from './pages/CreatePost';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Explore": Explore,
    "Reels": Reels,
    "Communities": Communities,
    "Marketplace": Marketplace,
    "Messages": Messages,
    "Wallet": Wallet,
    "Profile": Profile,
    "CommunityDetail": CommunityDetail,
    "CreatePost": CreatePost,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};