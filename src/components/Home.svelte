<script lang="ts">
  import EstimateDisplay from './estimator/EstimateDisplay.svelte';
  
  // Sample data for demonstration
  const sampleResult = {
    estimate: {
      title: 'Sample Estimate',
      currency: 'USD',
      totalAmount: 0,
      lineItems: []
    }
  };
</script>


  <div class="mx-auto">
    
    <div class="bg-white rounded-lg shadow-md p-6">
      <EstimateDisplay result={sampleResult} />
    </div>
  </div>
