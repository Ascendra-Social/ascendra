import BusinessCenter from './pages/BusinessCenter';
import Communities from './pages/Communities';
import CommunityDetail from './pages/CommunityDetail';
import CommunityModeration from './pages/CommunityModeration';
import CreatePost from './pages/CreatePost';
import Explore from './pages/Explore';
import Home from './pages/Home';
import ListingDetail from './pages/ListingDetail';
import Marketplace from './pages/Marketplace';
import Messages from './pages/Messages';
import Moderation from './pages/Moderation';
import Profile from './pages/Profile';
import Reels from './pages/Reels';
import VerificationReview from './pages/VerificationReview';
import Wallet from './pages/Wallet';
import __Layout from './Layout.jsx';


export const PAGES = {
    "BusinessCenter": BusinessCenter,
    "Communities": Communities,
    "CommunityDetail": CommunityDetail,
    "CommunityModeration": CommunityModeration,
    "CreatePost": CreatePost,
    "Explore": Explore,
    "Home": Home,
    "ListingDetail": ListingDetail,
    "Marketplace": Marketplace,
    "Messages": Messages,
    "Moderation": Moderation,
    "Profile": Profile,
    "Reels": Reels,
    "VerificationReview": VerificationReview,
    "Wallet": Wallet,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};