// Centralized copy so Hebrew/RTL can be added later (BUILD_SPEC section 7).
// v1 ships English/LTR only.
export const strings = {
  landing: {
    tagline: "The trusted way to fund and finish home projects.",
    getStarted: "Get Started",
    logIn: "Log In",
  },
  login: {
    title: "Log In",
    email: "Email",
    password: "Password",
    submit: "Log In",
    registerPrompt: "Don't have an account?",
    registerLink: "Register",
  },
  register: {
    title: "Create Account",
    fullName: "Full Name",
    email: "Email",
    phone: "Phone",
    password: "Password",
    terms: "I agree to the Terms of Service and Privacy Policy",
    submit: "Create Account",
    loginPrompt: "Already have an account?",
    loginLink: "Log In",
  },
  role: {
    title: "How will you use BuildTrust?",
    client: {
      title: "Client / Homeowner",
      description: "Post jobs and pay professionals through escrow.",
    },
    professional: {
      title: "Contractor / Professional",
      description: "Find jobs and get paid milestone by milestone.",
    },
    continue: "Continue",
  },
} as const;
