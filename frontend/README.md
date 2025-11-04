# 🚀 Mindshare Staking Pool - Frontend

A beautiful, modern web interface for the Mindshare Staking Pool, built with Next.js and Tailwind CSS.

## 🎨 Design

- **Theme**: Blue color scheme based on mw3hub.xyz
- **Style**: Modern glassmorphism design with smooth animations
- **Responsive**: Fully responsive and mobile-friendly
- **UX**: Intuitive interface with clear visual feedback

## ✨ Features

### Implemented
- ✅ Beautiful landing page with Mindshare branding
- ✅ Wallet connection interface (placeholder)
- ✅ Staking interface with amount input
- ✅ Lock duration selector
- ✅ Pool statistics display
- ✅ Your position overview
- ✅ Claim rewards button
- ✅ Unstake button
- ✅ Glassmorphism effects and animations

### Coming Soon
- ⏳ Real Solana wallet integration
- ⏳ Actual staking/unstaking functionality
- ⏳ Real-time balance updates
- ⏳ Transaction history
- ⏳ Pool selection interface

## 🏃 Running Locally

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🎯 Key Files

- `app/page.tsx` - Main staking interface
- `app/layout.tsx` - Root layout with metadata
- `app/globals.css` - Global styles and blue theme

## 🔗 Integration Points

The frontend is ready to integrate with:
- Program ID: `CTFpHF хотя по TtmR1ex5HAoq2i1MwMenD4Qrsxi`
- PDAs: All derived from the contract
- Functions: initialize, create_pool, stake, claim_rewards, unstake

## 📝 Next Steps

1. Install Solana wallet adapter packages
2. Connect to deployed program
3. Implement actual transaction logic
4. Add real-time data fetching
5. Deploy frontend to production

## 🎨 Color Palette

```css
--blue-primary: #1e40af    /* Deep blue */
--blue-secondary: #3b82f6  /* Medium blue */
--blue-accent: #60a5fa     /* Light blue */
--blue-dark: #1e3a8a       /* Darker blue */
--blue-light: #dbeafe      /* Very light blue */
```

## 🚀 Build for Production

```bash
npm run build
npm start
```

---

Built with ❤️ for Mindshare