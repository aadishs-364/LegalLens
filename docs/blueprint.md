# **App Name**: LegalLens

## Core Features:

- Contract Input Interface: Provide a prominent text area for users to paste contract clauses, along with a 'Translate & Analyze' button with loading states, a 'Load Sample Clause' option, and a 'Clear' button for ease of use.
- AI-Powered Legal Translation: Utilize an LLM as a tool to translate complex legal text into plain, clear, and concise English, maintaining original legal intent.
- Automated Risk Detection: Leverage an LLM as a tool to identify and categorize potential legal risks (e.g., liability, termination, IP assignment) within the provided contract text with severity levels (Low, Medium, High, Critical).
- Contextual Risk Explanation: Use an LLM as a tool to provide clear explanations of why each detected risk matters, its real-world implications, and suggest fairer alternatives or questions to ask a legal professional.
- Structured Results Dashboard: Display translated plain English, categorized risks, and contextual explanations within an intuitive, multi-section (e.g., tabbed or card-based) dashboard for easy comprehension.
- Secure LLM API Integration: Implement Next.js API routes for securely handling user input, making authenticated calls to the LLM (e.g., Anthropic Claude), enforcing strict JSON output schemas, and basic input validation and error handling.
- User History & Preferences: Store recent analysis results in local storage for quick access, alongside user interface preferences such as dark/light mode toggling.

## Style Guidelines:

- Dark color scheme for a professional and focused user experience. Primary interactive elements will feature a bright blue (#8CC9FF), drawing the eye while conveying clarity. The background will be a subtle dark blue-grey (#20262B) to minimize eye strain and enhance content readability. An accent color of soft turquoise (#75CBCE2) will be used to highlight insightful information and subtle UI flourishes, chosen for its complementary, calming effect.
- All text, including headlines and body, will use the 'Inter' sans-serif typeface for its modern, clean aesthetic and excellent legibility across all screen sizes, supporting efficient reading of detailed legal content.
- Utilize clean, outline-style icons from a modern library like Lucide, consistent with a professional and minimalist design language, particularly for action buttons, risk indicators, and navigation elements, integrating seamlessly with shadcn/ui components.
- A responsive, split-panel layout on larger screens will present the contract input area and analysis results side-by-side, optimizing for desktop productivity. On smaller devices, this will fluidly transition to a stacked, mobile-first design, ensuring readability and ease of interaction on handheld devices.
- Subtle, smooth animations will enhance user feedback during processes such as loading states, content streaming, and result reveals. This will include skeleton screens for data fetching and elegant transitions for new information, contributing to a fluid and polished user experience.