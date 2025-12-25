import Communities from './pages/Communities';
import CommunityDetail from './pages/CommunityDetail';
import CreatePost from './pages/CreatePost';
import Explore from './pages/Explore';
import Home from './pages/Home';
import ListingDetail from './pages/ListingDetail';
import Marketplace from './pages/Marketplace';
import Messages from './pages/Messages';
import Profile from './pages/Profile';
import Reels from './pages/Reels';
import Wallet from './pages/Wallet';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Communities": Communities,
    "CommunityDetail": CommunityDetail,
    "CreatePost": CreatePost,
    "Explore": Explore,
    "Home": Home,
    "ListingDetail": ListingDetail,
    "Marketplace": Marketplace,
    "Messages": Messages,
    "Profile": Profile,
    "Reels": Reels,
    "Wallet": Wallet,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};