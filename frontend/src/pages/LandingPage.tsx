import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  Heart,
  Users,
  Award,
  CheckCircle,
  Soup,
  Home,
  Briefcase,
  Activity,
  Compass,
  ShieldCheck,
  MessageSquare,
  MapPin,
  HeartHandshake
} from 'lucide-react';
import { AnimatedCounter } from '../components/common/AnimatedCounter';

// Custom FAQ Type
interface FAQItemProps {
  question: string;
  answer: string;
}

const FAQItem: React.FC<FAQItemProps> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-forest-light/35 py-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center text-left font-display font-medium text-forest-dark text-lg py-2 hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-md"
        aria-expanded={isOpen}
      >
        <span>{question}</span>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-primary shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-primary shrink-0" />
        )}
      </button>
      <motion.div
        initial={false}
        animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="overflow-hidden"
      >
        <p className="text-emerald-950/80 leading-relaxed mt-2 pb-2 text-base">
          {answer}
        </p>
      </motion.div>
    </div>
  );
};

export const LandingPage: React.FC = () => {
  const faqs = [
    {
      question: 'What is Sahay, and who can use it?',
      answer: 'Sahay is an AI-powered support platform designed to bridge the gap between migrants in need and local care providers. Migrants can post assistance requests, while verified NGOs, passionate volunteers, and compassionate local citizens can review and fulfill these requests.'
    },
    {
      question: 'How are NGOs verified on the platform?',
      answer: 'NGO security is our top priority. We verify organizations through their legal credentials, including government registration details and NGO Darpan IDs. Once verified, NGOs receive a green badge indicating they are safe, trusted entities.'
    },
    {
      question: 'Is there a cost to use the Sahay platform?',
      answer: 'No, Sahay is completely free for all migrants, volunteers, and NGOs. Our mission is to promote volunteerism and ensure that help reaches those who need it most, without any barriers.'
    },
    {
      question: 'How does real-time chat work?',
      answer: 'Once an NGO or volunteer responds to a migrant\'s request, and the migrant accepts the response, a secure chat room is opened. This allows both parties to discuss logistics, share locations, and coordinate assistance safely.'
    },
    {
      question: 'Can I help as an individual without belonging to an NGO?',
      answer: 'Yes! You can register as a Volunteer. Volunteers can browse nearby help requests and offer support for jobs, food distribution, guidance, and medical assistance in their local communities.'
    }
  ];

  const features = [
    {
      icon: <Soup className="w-6 h-6 text-primary" />,
      title: 'Food Assistance',
      desc: 'Connect with community kitchens, food drives, and dry ration distribution points nearby.'
    },
    {
      icon: <Home className="w-6 h-6 text-primary" />,
      title: 'Shelter Support',
      desc: 'Find temporary shelters, night shelters, or low-cost accommodation verified for safety.'
    },
    {
      icon: <Briefcase className="w-6 h-6 text-primary" />,
      title: 'Employment Help',
      desc: 'Access local daily wage work, skills training programs, and fair job opportunities.'
    },
    {
      icon: <Activity className="w-6 h-6 text-primary" />,
      title: 'Medical Assistance',
      desc: 'Locate free clinics, ambulance services, mental support, and emergency medical camps.'
    },
    {
      icon: <Compass className="w-6 h-6 text-primary" />,
      title: 'General Guidance',
      desc: 'Get language translation, document registration assistance, and navigation guidance.'
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-primary" />,
      title: 'AI Verification',
      desc: 'Ensures support safety by pre-screening documents, minimizing spam, and verifying NGO status.'
    },
    {
      icon: <MessageSquare className="w-6 h-6 text-primary" />,
      title: 'Real-time Chat',
      desc: 'Instant, secure communication between helpers and request creators to arrange aid.'
    },
    {
      icon: <MapPin className="w-6 h-6 text-primary" />,
      title: 'Nearby Help',
      desc: 'Location-based requests showing helpers exactly where assistance is needed in real-time.'
    }
  ];

  const steps = [
    {
      step: '01',
      title: 'Register',
      desc: 'Create your account as a Migrant, NGO, or individual Volunteer.'
    },
    {
      step: '02',
      title: 'Post Your Need',
      desc: 'Detail your assistance request, specify the service type, and set your location.'
    },
    {
      step: '03',
      title: 'NGO Notification',
      desc: 'Local NGOs and volunteers in the vicinity get notified instantly of your request.'
    },
    {
      step: '04',
      title: 'Coordinate & Chat',
      desc: 'Message each other through our secure real-time portal to detail help delivery.'
    },
    {
      step: '05',
      title: 'Receive Help',
      desc: 'Get safe, direct support for food, medical care, jobs, or emergency shelter.'
    }
  ];

  const testimonials = [
    {
      quote: 'Sahay connected me to an NGO that provided food and warm shelter within 3 hours when I arrived in Lucknow. I felt safe and cared for.',
      author: 'Rajesh Kumar',
      role: 'Migrant Construction Worker'
    },
    {
      quote: 'Through Sahay, our volunteer network has mobilized over 500 dry ration kits to stranded families. The real-time mapping is exceptionally precise.',
      author: 'Sunita Sharma',
      role: 'Director, Hope Foundation NGO'
    },
    {
      quote: 'I wanted to help locally but did not know where to start. Sahay let me support a migrant family nearby with language interpretation and paperwork.',
      author: 'Amit Patel',
      role: 'Community Volunteer'
    }
  ];

  return (
    <div className="space-y-24 md:space-y-32">
      {/* HERO SECTION */}
      <section className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center pt-8">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="space-y-6 text-left"
        >
          <div className="inline-flex items-center space-x-2 bg-secondary/15 border border-secondary/25 px-4 py-1.5 rounded-full text-forest-dark font-medium text-sm">
            <HeartHandshake className="w-4 h-4 text-primary" />
            <span>AI-Powered Hope & Care Platform</span>
          </div>

          <h1 className="font-display font-extrabold text-5xl md:text-6xl text-forest-dark leading-tight tracking-tight">
            Together, We Build <br />
            <span className="text-primary relative inline-block">
              a Better Tomorrow.
              <span className="absolute left-0 bottom-1 w-full h-1.5 bg-accent/40 rounded-full -z-10" />
            </span>
          </h1>

          <p className="text-lg text-emerald-950/80 leading-relaxed max-w-xl">
            Find nearby NGOs and volunteers ready to support migrants with food, shelter, healthcare, jobs, and guidance.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <Link
              to="/register"
              className="bg-primary hover:bg-forest-dark text-white font-semibold text-center px-8 py-4 rounded-full shadow-lg shadow-primary/20 hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
            >
              Get Started
            </Link>
            <a
              href="#features"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="glass-panel text-forest-dark hover:bg-secondary/10 hover:text-primary font-semibold text-center px-8 py-4 rounded-full transition-all duration-300"
            >
              Explore Services
            </a>
          </div>
        </motion.div>

        {/* Dynamic Vector SVG Illustration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="relative w-full aspect-[4/3] max-w-lg mx-auto lg:max-w-none"
        >
          <svg viewBox="0 0 500 400" className="w-full h-full drop-shadow-xl" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FFF9C4" /> {/* Sunrise yellow */}
                <stop offset="60%" stopColor="#E8F5E9" /> {/* Mint sky */}
                <stop offset="100%" stopColor="#F8FFF8" />
              </linearGradient>
              <linearGradient id="hillGrad1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#81C784" />
                <stop offset="100%" stopColor="#4CAF50" />
              </linearGradient>
              <linearGradient id="hillGrad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#66BB6A" />
                <stop offset="100%" stopColor="#2E7D32" />
              </linearGradient>
              <linearGradient id="riverGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#80DEEA" />
                <stop offset="50%" stopColor="#4DD0E1" />
                <stop offset="100%" stopColor="#00ACC1" />
              </linearGradient>
            </defs>

            {/* Sky Background */}
            <rect width="500" height="300" fill="url(#skyGrad)" rx="30" />

            {/* Glowing Sun */}
            <motion.circle
              cx="250"
              cy="160"
              r="45"
              fill="#FFB74D"
              opacity="0.9"
              animate={{ scale: [1, 1.05, 1], y: [0, -4, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Back Hills */}
            <path d="M 0 300 Q 150 180 300 240 T 500 220 L 500 400 L 0 400 Z" fill="url(#hillGrad1)" opacity="0.8" />

            {/* River flowing */}
            <path d="M 120 230 C 220 230 180 340 320 340 C 370 340 430 310 500 300 L 500 400 L 0 400 L 0 320 Z" fill="url(#riverGrad)" />

            {/* Front Hills */}
            <path d="M 0 280 Q 100 240 220 280 T 500 260 L 500 400 L 0 400 Z" fill="url(#hillGrad2)" />

            {/* Minimalist Sprout Tree Left */}
            <g transform="translate(60, 180)">
              <rect x="18" y="40" width="6" height="60" fill="#8D6E63" rx="3" />
              {/* Foliage */}
              <path d="M 21 0 C -5 20 -5 50 21 50 C 47 50 47 20 21 0 Z" fill="#2E7D32" opacity="0.9" />
              <path d="M 21 5 C 5 20 5 45 21 45 C 37 45 37 20 21 5 Z" fill="#66BB6A" opacity="0.9" />
            </g>

            {/* Sprout Tree Right */}
            <g transform="translate(390, 190)">
              <rect x="12" y="30" width="4" height="60" fill="#8D6E63" rx="2" />
              <path d="M 14 0 C -5 15 -5 40 14 40 C 33 40 33 15 14 0 Z" fill="#1B5E20" opacity="0.95" />
              <path d="M 14 5 C 0 15 0 35 14 35 C 28 35 28 15 14 5 Z" fill="#A5D6A7" opacity="0.9" />
            </g>

            {/* Animated Birds flying */}
            <g>
              {/* Bird 1 */}
              <motion.path
                d="M 150 100 Q 155 90 160 100 Q 165 90 170 100"
                fill="none"
                stroke="#1B5E20"
                strokeWidth="2.5"
                strokeLinecap="round"
                animate={{ y: [0, -8, 0], x: [0, 15, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
              />
              {/* Bird 2 */}
              <motion.path
                d="M 320 80 Q 324 72 328 80 Q 332 72 336 80"
                fill="none"
                stroke="#1B5E20"
                strokeWidth="2"
                strokeLinecap="round"
                animate={{ y: [0, -6, 0], x: [0, -10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              />
            </g>
          </svg>
        </motion.div>
      </section>

      {/* STATISTICS SECTION */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="glass-panel rounded-3xl p-8 md:p-12 shadow-sm border border-primary/10 grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 text-center">
          <div className="space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-secondary/15 text-primary mb-1">
              <Award className="w-6 h-6" />
            </div>
            <AnimatedCounter value={45} suffix="+" />
            <p className="text-sm font-medium text-emerald-900/60 font-display">Verified NGOs</p>
          </div>
          <div className="space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-secondary/15 text-primary mb-1">
              <Users className="w-6 h-6" />
            </div>
            <AnimatedCounter value={12400} />
            <p className="text-sm font-medium text-emerald-900/60 font-display">Registered Migrants</p>
          </div>
          <div className="space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-secondary/15 text-primary mb-1">
              <Heart className="w-6 h-6" />
            </div>
            <AnimatedCounter value={1850} suffix="+" />
            <p className="text-sm font-medium text-emerald-900/60 font-display">Active Volunteers</p>
          </div>
          <div className="space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-secondary/15 text-primary mb-1">
              <CheckCircle className="w-6 h-6" />
            </div>
            <AnimatedCounter value={8900} suffix="+" />
            <p className="text-sm font-medium text-emerald-900/60 font-display">Requests Completed</p>
          </div>
        </div>
      </section>

      {/* FEATURES/SERVICES GRID SECTION */}
      <section id="features" className="max-w-7xl mx-auto px-6 text-center space-y-12">
        <div className="max-w-2xl mx-auto space-y-4">
          <h2 className="font-display font-bold text-3xl md:text-4xl text-forest-dark">
            Our Services & Care Features
          </h2>
          <p className="text-emerald-950/70 text-lg">
            Providing tailored support categories to address essential requirements and secure community collaboration.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feat, idx) => (
            <motion.div
              key={idx}
              whileHover={{ y: -6, scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="bg-white rounded-2xl p-6 text-left border border-forest-light/20 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-bg-nature border border-secondary/20 flex items-center justify-center">
                  {feat.icon}
                </div>
                <h3 className="font-display font-semibold text-lg text-forest-dark">
                  {feat.title}
                </h3>
                <p className="text-sm text-emerald-950/75 leading-relaxed">
                  {feat.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-6 space-y-16">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <h2 className="font-display font-bold text-3xl md:text-4xl text-forest-dark">
            How Sahay Works
          </h2>
          <p className="text-emerald-950/70 text-lg">
            A simple, secure 5-step loop connecting individuals seeking aid with nearby trusted networks.
          </p>
        </div>

        <div className="relative">
          {/* Connecting line */}
          <div className="hidden lg:block absolute top-1/2 left-6 right-6 h-0.5 bg-gradient-to-r from-accent via-secondary to-primary -translate-y-1/2 z-0 opacity-40" />

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8 relative z-10">
            {steps.map((st, idx) => (
              <div
                key={idx}
                className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 text-center border border-forest-light/20 shadow-sm space-y-4"
              >
                <div className="w-12 h-12 rounded-full bg-primary text-white font-display font-bold text-lg flex items-center justify-center mx-auto shadow-md">
                  {st.step}
                </div>
                <h3 className="font-display font-semibold text-base text-forest-dark">
                  {st.title}
                </h3>
                <p className="text-xs text-emerald-950/70 leading-relaxed">
                  {st.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS SECTION */}
      <section className="max-w-7xl mx-auto px-6 space-y-12">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <h2 className="font-display font-bold text-3xl md:text-4xl text-forest-dark">
            Voices of Trust and Community
          </h2>
          <p className="text-emerald-950/70 text-lg">
            Real stories of people finding safety, relief, and collaboration on Sahay.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((test, idx) => (
            <div
              key={idx}
              className="glass-panel-dark rounded-2xl p-8 flex flex-col justify-between border border-primary/5 space-y-6"
            >
              <p className="italic text-emerald-950/80 leading-relaxed text-base">
                "{test.quote}"
              </p>
              <div>
                <h4 className="font-display font-bold text-forest-dark">{test.author}</h4>
                <p className="text-xs text-emerald-900/60 font-medium mt-0.5">{test.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="max-w-3xl mx-auto px-6 space-y-8">
        <div className="text-center space-y-4">
          <h2 className="font-display font-bold text-3xl md:text-4xl text-forest-dark">
            Frequently Asked Questions
          </h2>
          <p className="text-emerald-950/70">
            Everything you need to know about the Sahay portal.
          </p>
        </div>

        <div className="glass-panel rounded-3xl p-6 md:p-8 shadow-sm border border-primary/10">
          {faqs.map((faq, idx) => (
            <FAQItem key={idx} question={faq.question} aria-label={`Question: ${faq.question}`} answer={faq.answer} />
          ))}
        </div>
      </section>
    </div>
  );
};
