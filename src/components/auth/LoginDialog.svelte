<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "$lib/components/ui/dialog";
  import { signInWithEmail, signUpWithEmail } from "../../stores/authStore";
  import { toast } from "$lib/components/ui/sonner";

  export let open = false;
  export let onOpenChange = (value: boolean) => {};

  let isLogin = true;
  let email = "";
  let password = "";
  let loading = false;
  let error = "";

  $: if (open) {
    email = "";
    password = "";
    error = "";
    loading = false;
  }

  function toggleAuthMode() {
    isLogin = !isLogin;
    error = "";
  }

  async function handleSubmit() {
    if (!email || !password) {
      error = "Please fill in all fields";
      return;
    }

    loading = true;
    error = "";

    try {
      if (isLogin) {
        await signInWithEmail(email, password);
        onOpenChange(false);
      } else {
        // Handle signup - the toast is shown in the signUpWithEmail function
        const { user } = await signUpWithEmail(email, password);
        
        // Close the dialog only if signup was successful
        if (user) {
          onOpenChange(false);
          
          // Additional toast to make the verification requirement very clear
          toast("Account Created", {
            description: "Your account has been created. Please verify your email to continue.",
            duration: 5000,
          });
        }
      }
    } catch (err) {
      console.error("Auth error:", err);
      error = err.message || "Authentication failed";
    } finally {
      loading = false;
    }
  }
</script>

<Dialog {open} onOpenChange={onOpenChange}>
  <DialogContent class="sm:max-w-[425px]">
    <DialogHeader>
      <DialogTitle>{isLogin ? "Login" : "Sign Up"}</DialogTitle>
      <DialogDescription>
        {isLogin
          ? "Enter your credentials to access your account."
          : "Create a new account to get started."}
      </DialogDescription>
    </DialogHeader>
    <form on:submit|preventDefault={handleSubmit} class="space-y-4 py-4">
      <div class="space-y-2">
        <Label for="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="your.email@example.com"
          bind:value={email}
          required
          class=""
        />
      </div>
      <div class="space-y-2">
        <Label for="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          bind:value={password}
          required
          class=""
        />
      </div>

      {#if error}
        <div class="text-sm text-red-500">{error}</div>
      {/if}

      <DialogFooter class="flex flex-col sm:flex-row gap-2 sm:gap-0">
        <button
          type="button"
          on:click={toggleAuthMode}
          class="mt-2 sm:mt-0 w-full sm:w-auto px-4 py-2 text-center hover:bg-accent hover:text-accent-foreground rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50"
          disabled={loading}
        >
          <span class="w-full text-center">
            {isLogin ? "Need an account? Sign up" : "Already have an account? Login"}
          </span>
        </button>
        <Button type="submit" disabled={loading} class="mt-2 sm:mt-0">
          {loading ? "Processing..." : isLogin ? "Login" : "Sign Up"}
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
