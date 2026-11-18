export const en = {
  auth: {
    signup: {
      account: {
        title: "Create your account,",
        subtitle: "join Penelope.",
        name: "Full name",
        namePlaceholder: "Ada Lovelace",
        username: "Username",
        usernamePlaceholder: "ada",
        email: "Email",
        emailPlaceholder: "you@example.com",
        password: "Password",
        passwordPlaceholder: "Min. 8 characters",
        next: "Continue",
      },
      instance: {
        title: "Name your instance,",
        subtitle: "you can change this later.",
        name: "Instance name",
        namePlaceholder: "My Server",
        description: "Description",
        descriptionPlaceholder: "Production infrastructure for Acme",
        next: "Finish setup",
        back: "Back",
      },
      done: {
        title: "Penelope is ready,",
        subtitle: "let's deploy something.",
        cta: "Go to dashboard",
      },
      hasAccount: "Already have an account?",
      signIn: "Sign in",
    },
    login: {
      title: "Sign in",
      subtitle: "Welcome back.",
      email: "Email",
      emailPlaceholder: "you@example.com",
      password: "Password",
      passwordPlaceholder: "••••••••",
      forgotPassword: "Forgot password?",
      submit: "Sign in",
      noAccount: "Don't have an account?",
      signUp: "Create one",
    },
  },
  brand: {
    name: "Penelope",
    tagline: "Deploy anything, anywhere.",
    topology: {
      nodeLabels: {
        web: "web",
        api: "api",
        postgres: "postgres",
        redis: "redis",
        worker: "worker",
      },
    },
  },
} as const;

export type Messages = typeof en;
