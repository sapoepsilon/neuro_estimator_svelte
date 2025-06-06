// Import route components
import EstimatorFormWrapper from "./components/estimator/EstimatorFormWrapper.svelte";
import Home from "./components/Home.svelte";
import AuthCallback from "./components/auth/AuthCallback.svelte";

// Define routes
const routes = {
  // Home page - shows the EstimateDisplay component
  "/": Home,

  // Estimator form page
  "/estimator": EstimatorFormWrapper,
  
  // Auth callback route for handling email verification
  "/auth/callback": AuthCallback,

  // Catch-all route - redirects to home
  "*": Home,
};

export default routes;
