📝 MemoMingle

A modern note-taking and memory management app built with React, Next.js 15, Firebase, and TailwindCSS.
MemoMingle helps users create, organize, and theme dynamic decks and cards — perfect for learning, journaling, or managing ideas.

🚀 Built as part of my portfolio to explore frontend + backend integration, real-time data sync, and open-source collaboration practices.

✨ Features

📚 Decks & Cards – Organize notes in structured decks.

🎨 Custom Themes – Personalize cards with styles and moods.

🖋️ Rich Text Editor – Powered by TipTap
 for a smooth editing experience.

⚡ Local Cache + Firestore Sync – Work offline, sync when back online.

🔐 User Authentication – Firebase Auth integration (Google sign-in).

📱 Responsive UI – Mobile-first design with TailwindCSS.

🛠️ Tech Stack

Frontend: Next.js 15, React, TailwindCSS

Editor: TipTap (ProseMirror)

Backend: Firebase Firestore + Firebase Auth

Other Tools: Git, GitHub, Vercel

📂 Project Structure
MemoMingle/
├── components/     # Reusable UI components  
├── pages/          # Next.js routes  
├── lib/            # Firebase config + helpers  
├── styles/         # Tailwind global styles  
├── public/         # Static assets  
└── README.md       # You are here 🚀

🧑‍💻 About Development

This project was created as both a learning journey and a portfolio piece.
I built the foundation, and also used AI-assisted coding (ChatGPT) to:

Debug complex Next.js setup issues

Generate boilerplate faster

Document code and write helper scripts

👉 I see AI not as a shortcut, but as a collaboration tool that speeds up learning and lets me focus on design, architecture, and problem-solving.

🌱 What I Learned

Structuring a full-stack app with Next.js + Firebase

Managing state and data sync between local cache and Firestore

Styling efficiently with utility-first CSS (Tailwind)

Working with rich text editors (TipTap/ProseMirror)

Using AI as a coding assistant while staying in control of architecture and quality

🚀 Getting Started
Prerequisites

Node.js (>=18)

Firebase project set up

Install & Run
git clone https://github.com/MarciaSatie/memo-mingle.git
cd memo-mingle
npm install
npm run dev


Then open http://localhost:3000
 🎉

📌 Future Improvements

 Add flashcard-style study mode

 Export/import notes as Markdown

 Collaborative decks (share with friends)

 AI-powered card suggestions

👩‍💻 Author

Marcia Satie
📍 Computer Science student @ SETU Waterford (graduating Dec 2026)
💡 Passionate about open-source, DevOps, and building tools that help people learn better.
🔗 GitHub
 | LinkedIn
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


## npm run deploy --> is the combined one-liner PowerShell script (build + deploy to Firebase together)
replaces: 
npm run build
firebase deploy --only hosting