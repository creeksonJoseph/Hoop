import { Link } from "react-router-dom";

const sections = [
  {
    title: "Privacy Policy",
    items: [
      {
        heading: "What information we collect",
        body: "When you connect your Instagram account to Hoop, we access your Direct Messages (DMs), the usernames of the people you are messaging, and their profile pictures. We only access the specific conversations you choose to share.",
      },
      {
        heading: "Who sees your data",
        body: "The only people who can read your shared DMs or send messages on your behalf are the friends (Wingmen) you explicitly send your secure Hoop link to.",
      },
      {
        heading: "How we store it",
        body: "Your messages are stored securely in our database to allow real-time syncing between you and your Wingmen. We do not use your private conversations to train AI models, and we will never sell your personal data to advertisers or data brokers.",
      },
      {
        heading: "How long we keep it",
        body: "Conversations remain on our servers only as long as your link is active. You can wipe your data at any time using the Data Deletion instructions below.",
      },
    ],
  },
  {
    title: "Data Deletion Instructions",
    items: [
      {
        heading: "Inside the Hoop App (Recommended)",
        body: "Log in to your Hoop dashboard, navigate to Settings, and scroll down to the Danger Zone. Click the Disconnect API Key & Delete Data button. This instantly wipes all your synced conversations, messages, and target profile pictures from our database. Only your basic Hoop login credentials remain.",
      },
    ],
  },
  {
    title: "Acceptable Use Policy",
    items: [
      {
        heading: "No Harassment or Abuse",
        body: "You may not use Hoop (or allow your Wingmen to use Hoop) to bully, harass, threaten, or spam anyone.",
      },
      {
        heading: "You Are Responsible",
        body: "You are handing the keyboard to your friends. If your Wingman sends something that violates Instagram's Community Guidelines, your Instagram account is the one that will get banned. Hoop takes zero legal liability for what is said through our platform.",
      },
      {
        heading: "No Unsolicited Spam",
        body: "You may only use Hoop for existing, consensual conversations. Using the API to blast unsolicited marketing links or spam will result in an immediate ban from Hoop.",
      },
      {
        heading: "The Kill Switch",
        body: "As the account owner, you are required to monitor the chats. If a Wingman goes rogue, it is your responsibility to revoke their link immediately.",
      },
    ],
  },
  {
    title: "Legal Disclaimer",
    items: [
      {
        heading: "Not Affiliated with Meta",
        body: 'Hoop is an independent third-party tool built using the official Meta Graph API via Zernio. Hoop is not affiliated with, endorsed by, sponsored by, or officially connected to Meta Platforms, Inc., Instagram, or WhatsApp. "Instagram" and "Meta" are registered trademarks of Meta Platforms, Inc.',
      },
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#f9f9f8] px-4 py-10 text-[#191918] selection:bg-[#e6f3fe] selection:text-[#0075de] sm:px-8 sm:py-14">
      <main className="mx-auto max-w-190 fade-up">
        <header className="mb-10 border-b border-[#dfdcd9] pb-8">
          <Link
            to="/login"
            className="mb-8 inline-flex items-center gap-2 text-[13px] font-semibold text-[#191918] hover:text-[#0075de] transition-colors"
          >
            <span className="flex size-8 items-center justify-center rounded-[8px] bg-[#191918] text-sm font-bold text-white">
              H
            </span>
            Hooop
          </Link>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0075de]">
            Legal
          </p>
          <h1 className="text-[28px] font-semibold tracking-tight text-[#191918] sm:text-[34px]">
            Privacy and Policies
          </h1>
          <p className="mt-3 max-w-150 text-[14px] leading-6 text-[#615d59]">
            How Hoop handles your data, how to delete it, and the rules for
            using the service responsibly.
          </p>
        </header>

        <div className="space-y-10">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="mb-4 text-[18px] font-semibold tracking-tight text-[#191918]">
                {section.title}
              </h2>
              <div className="space-y-5 border-t border-[#dfdcd9] pt-5">
                {section.items.map((item) => (
                  <div key={item.heading}>
                    <h3 className="text-[13px] font-semibold text-[#191918]">
                      {item.heading}
                    </h3>
                    <p className="mt-1.5 text-[13px] leading-6 text-[#615d59]">
                      {item.body}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-12 border-t border-[#dfdcd9] pt-5 text-[12px] text-[#8c8782]">
          <Link to="/login" className="text-[#0075de] hover:underline">
            Return to Hoop
          </Link>
        </footer>
      </main>
    </div>
  );
}
