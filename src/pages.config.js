/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AppStore from './pages/AppStore';
import BusinessCenter from './pages/BusinessCenter';
import BusinessPage from './pages/BusinessPage';
import Communities from './pages/Communities';
import CommunityDetail from './pages/CommunityDetail';
import CommunityModeration from './pages/CommunityModeration';
import CreateBusinessPage from './pages/CreateBusinessPage';
import CreatePost from './pages/CreatePost';
import CreatorDashboard from './pages/CreatorDashboard';
import Explore from './pages/Explore';
import FeatureRequests from './pages/FeatureRequests';
import Home from './pages/Home';
import ListingDetail from './pages/ListingDetail';
import Marketplace from './pages/Marketplace';
import Messages from './pages/Messages';
import Moderation from './pages/Moderation';
import Profile from './pages/Profile';
import Reels from './pages/Reels';
import SmartContracts from './pages/SmartContracts';
import VerificationReview from './pages/VerificationReview';
import Wallet from './pages/Wallet';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AppStore": AppStore,
    "BusinessCenter": BusinessCenter,
    "BusinessPage": BusinessPage,
    "Communities": Communities,
    "CommunityDetail": CommunityDetail,
    "CommunityModeration": CommunityModeration,
    "CreateBusinessPage": CreateBusinessPage,
    "CreatePost": CreatePost,
    "CreatorDashboard": CreatorDashboard,
    "Explore": Explore,
    "FeatureRequests": FeatureRequests,
    "Home": Home,
    "ListingDetail": ListingDetail,
    "Marketplace": Marketplace,
    "Messages": Messages,
    "Moderation": Moderation,
    "Profile": Profile,
    "Reels": Reels,
    "SmartContracts": SmartContracts,
    "VerificationReview": VerificationReview,
    "Wallet": Wallet,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};