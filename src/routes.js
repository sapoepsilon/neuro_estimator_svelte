// Import route components
import EstimatorFormWrapper from "./components/estimator/EstimatorFormWrapper.svelte";
import Home from "./components/Home.svelte";

// Define routes
const routes = {
  // Home page - shows the EstimateDisplay component
  "/": Home,

  // Estimator form page
  "/estimator": EstimatorFormWrapper,

  // Catch-all route - redirects to home
  "*": Home,
};

export default routes;
