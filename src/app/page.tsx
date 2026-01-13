"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
// import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Heart,
  Shield,
  Star,
  Search,
  Calendar,
  MessageCircle,
  Menu,
  X,
  ChevronRight,
  // ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// --- Assets ---
import icon from "../../public/hh-icon.png";

// --- Components ---

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled
        ? "bg-white/80 backdrop-blur-md shadow-sm py-3"
        : "bg-transparent py-5"
        }`}
    >
      <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="relative w-8 h-8 md:w-10 md:h-10 transition-transform group-hover:scale-105">
            <Image
              src={icon}
              alt="Hug Harmony Logo"
              fill
              className="object-contain"
            />
          </div>
          <span className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
            Hug Harmony
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          <Link
            href="#features"
            className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
          >
            Why Cuddling?
          </Link>
          <Link
            href="#how-it-works"
            className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
          >
            How it Works
          </Link>
          <Link
            href="/login"
            className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
          >
            Log In
          </Link>
          <Button asChild className="rounded-full px-6 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300 transform hover:-translate-y-0.5">
            <Link href="/register">Get Started</Link>
          </Button>
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden p-2 text-gray-600"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="absolute top-full left-0 right-0 bg-white shadow-lg border-t border-gray-100 p-4 md:hidden flex flex-col gap-4"
        >
          <Link
            href="#features"
            className="text-gray-600 font-medium p-2"
            onClick={() => setMobileMenuOpen(false)}
          >
            Why Cuddling?
          </Link>
          <Link
            href="#how-it-works"
            className="text-gray-600 font-medium p-2"
            onClick={() => setMobileMenuOpen(false)}
          >
            How it Works
          </Link>
          <div className="h-px bg-gray-100 my-2" />
          <Link
            href="/login"
            className="text-gray-600 font-medium p-2"
            onClick={() => setMobileMenuOpen(false)}
          >
            Log In
          </Link>
          <Button asChild className="w-full rounded-full">
            <Link href="/register">Get Started</Link>
          </Button>
        </motion.div>
      )}
    </nav>
  );
};

const HeroSection = () => {
  return (
    <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-0 right-0 -z-10 w-full h-full overflow-hidden opacity-30 pointer-events-none">
        <div className="absolute -top-[10%] -right-[10%] w-[500px] h-[500px] rounded-full bg-pink-200 blur-3xl animate-blob" />
        <div className="absolute top-[20%] -left-[10%] w-[400px] h-[400px] rounded-full bg-purple-200 blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute -bottom-[10%] right-[20%] w-[600px] h-[600px] rounded-full bg-orange-100 blur-3xl animate-blob animation-delay-4000" />
      </div>

      <div className="container mx-auto px-4 md:px-6 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-4xl"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 border border-gray-200 shadow-sm mb-8 backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-gray-600">Now available in your area</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 text-gray-900 leading-[1.1]">
            Experience the healing power of{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500">
              verified platonic touch
            </span>
            .
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Connect with trained professionals for safe, strictly platonic cuddle sessions designed to reduce stress and improve well-being.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              asChild
              size="lg"
              className="rounded-full text-lg px-8 py-6 h-auto shadow-xl shadow-primary/25 hover:shadow-primary/40 transition-all duration-300 hover:scale-105"
            >
              <Link href="/register?role=client">Find a Cuddler</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="rounded-full text-lg px-8 py-6 h-auto border-2 hover:bg-gray-50 transition-all duration-300 hover:scale-105 group"
            >
              <Link href="/register?role=professional">
                <span>Become a Professional</span>
                <ChevronRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        </motion.div>

        {/* Stats / Social Proof */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-16 text-center"
        >
          {[
            { label: "Verified Pros", value: "500+" },
            { label: "Happy Clients", value: "10k+" },
            { label: "Sessions", value: "25k+" },
            { label: "Rating", value: "4.9/5" },
          ].map((stat, i) => (
            <div key={i} className="flex flex-col gap-1">
              <span className="text-3xl md:text-4xl font-bold text-gray-900">{stat.value}</span>
              <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">{stat.label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

const ValueProps = () => {
  const features = [
    {
      icon: Shield,
      title: "Safe & Verified",
      desc: "Every professional undergoes rigorous background checks and screening interviews.",
      color: "bg-blue-100 text-blue-600",
    },
    {
      icon: Heart,
      title: "Mental Wellness",
      desc: "Oxytocin-releasing therapy specifically designed to reduce anxiety and loneliness.",
      color: "bg-pink-100 text-pink-600",
    },
    {
      icon: Star,
      title: "Premium Experience",
      desc: "Curated environments and professionally trained practitioners for your comfort.",
      color: "bg-amber-100 text-amber-600",
    },
  ];

  return (
    <section id="features" className="py-24 bg-white">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-gray-900">Why choose Hug Harmony?</h2>
          <p className="text-lg text-gray-600">
            We&apos;ve reimagined platonic touch therapy with safety and professionalism at the core of everything we do.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -5 }}
              className="p-8 rounded-3xl bg-gray-50 border border-gray-100 hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300"
            >
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${feature.color}`}
              >
                <feature.icon className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">{feature.title}</h3>
              <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const HowItWorks = () => {
  const steps = [
    {
      id: "01",
      title: "Browse Profiles",
      desc: "Filter by location, rates, and cuddle styles to find your perfect match.",
      icon: Search,
    },
    {
      id: "02",
      title: "Book a Session",
      desc: "Choose a time that works for you and securely book through our platform.",
      icon: Calendar,
    },
    {
      id: "03",
      title: "Relax & Reconnect",
      desc: "Enjoy a strictly platonic session designed to help you decompress.",
      icon: MessageCircle,
    },
  ];

  return (
    <section id="how-it-works" className="py-24 bg-gray-50/50">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row gap-16 items-center">
          <div className="md:w-1/2">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-gray-900">
              Your journey to relaxation starts here.
            </h2>
            <p className="text-lg text-gray-600 mb-10">
              We&apos;ve made it incredibly simple to find safe, professional platonic touch therapy near you.
            </p>
            <div className="space-y-8">
              {steps.map((step) => (
                <div key={step.id} className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full border-2 border-primary/20 flex items-center justify-center text-primary font-bold bg-white">
                    {step.id}
                  </div>
                  <div>
                    <h4 className="text-xl font-bold mb-2 text-gray-900">{step.title}</h4>
                    <p className="text-gray-600">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="md:w-1/2 relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-pink-200 to-violet-200 rounded-[2.5rem] transform rotate-3 blur-sm" />
            <div className="relative bg-white rounded-[2rem] p-8 shadow-2xl border border-gray-100">
              {/* Mock UI Card */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-gray-200" />
                <div>
                  <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
                  <div className="h-3 w-20 bg-gray-100 rounded" />
                </div>
              </div>
              <div className="space-y-3 mb-6">
                <div className="h-3 w-full bg-gray-100 rounded" />
                <div className="h-3 w-5/6 bg-gray-100 rounded" />
                <div className="h-3 w-4/6 bg-gray-100 rounded" />
              </div>
              <div className="flex gap-3">
                <div className="h-10 w-full bg-primary/10 rounded-xl" />
                <div className="h-10 w-full bg-gray-100 rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const CTASection = () => {
  return (
    <section className="py-24">
      <div className="container mx-auto px-4 md:px-6">
        <div className="relative rounded-[2.5rem] overflow-hidden bg-gray-900 text-white p-12 md:p-24 text-center">
          <div className="absolute top-0 right-0 -z-10 bg-gradient-to-br from-gray-800 to-gray-900 w-full h-full" />
          <div className="absolute top-0 right-0 p-32 bg-primary/20 blur-[100px] rounded-full" />

          <h2 className="text-3xl md:text-5xl font-bold mb-8">Ready to feel better?</h2>
          <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
            Join thousands of others who have discovered the transformative power of professional platonic touch.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="rounded-full text-lg px-8 py-6 h-auto bg-white text-gray-900 hover:bg-gray-100 border-0"
            >
              <Link href="/register">Get Started Now</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

const Footer = () => {
  return (
    <footer className="bg-white border-t border-gray-100 py-16">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="relative w-8 h-8">
                <Image
                  src={icon}
                  alt="Hug Harmony Logo"
                  fill
                  className="object-contain"
                />
              </div>
              <span className="font-bold text-xl">Hug Harmony</span>
            </div>
            <p className="text-gray-500 text-sm">
              Connecting people through safe, platonic touch since 2024.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-4">Platform</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><Link href="#" className="hover:text-primary">Find a Cuddler</Link></li>
              <li><Link href="#" className="hover:text-primary">Become a Pro</Link></li>
              <li><Link href="#" className="hover:text-primary">Safety</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><Link href="#" className="hover:text-primary">About Us</Link></li>
              <li><Link href="#" className="hover:text-primary">Careers</Link></li>
              <li><Link href="#" className="hover:text-primary">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><Link href="#" className="hover:text-primary">Privacy Policy</Link></li>
              <li><Link href="#" className="hover:text-primary">Terms of Service</Link></li>
              <li><Link href="#" className="hover:text-primary">Guidelines</Link></li>
            </ul>
          </div>
        </div>
        <div className="text-center text-sm text-gray-400 pt-8 border-t border-gray-50">
          &copy; {new Date().getFullYear()} Hug Harmony. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-white text-gray-900 selection:bg-pink-100 selection:text-pink-900">
      <Navbar />
      <HeroSection />
      <ValueProps />
      <HowItWorks />
      <CTASection />
      <Footer />
    </div>
  );
};

export default LandingPage;
