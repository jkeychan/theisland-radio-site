"use client";

import { useEffect, useRef, useState } from "react";
import { TracksThisWeek } from "@/components/TracksThisWeek";

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const gifRef = useRef<HTMLImageElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const [isVideoVisible, setIsVideoVisible] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    const gif = gifRef.current;
    const image = imageRef.current;
    if (!video || !gif || !image) return;

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    const handleVideoError = () => {
      console.error("Video error, falling back to GIF");
      video.style.display = "none";
      gif.style.display = "block";
      setVideoFailed(true);
      setIsVideoVisible(false);
    };

    const handleVideoCanPlay = async () => {
      video.style.display = "block";
      gif.style.display = "none";
      setIsVideoVisible(true);
      try {
        if (isMobile) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        await video.play();
        video.loop = true;
      } catch (error) {
        console.error("Error playing video:", error);
        if (isMobile) handleVideoError();
      }
    };

    const handleVideoLoadedData = async () => {
      try {
        video.muted = true;
        video.loop = true;
        if (isMobile) {
          video.setAttribute("playsinline", "true");
          video.setAttribute("webkit-playsinline", "true");
        }
        await video.play();
      } catch (error) {
        console.error("Error playing video on load:", error);
        if (isMobile) handleVideoError();
      }
    };

    video.addEventListener("error", handleVideoError);
    video.addEventListener("canplay", handleVideoCanPlay);
    video.addEventListener("loadeddata", handleVideoLoadedData);

    video.muted = true;
    video.loop = true;
    if (isMobile) {
      video.setAttribute("playsinline", "true");
      video.setAttribute("webkit-playsinline", "true");
    }

    video.play().catch((error) => {
      console.error("Initial play failed:", error);
      if (isMobile) {
        setTimeout(() => {
          if (video.paused) handleVideoError();
        }, 1000);
      }
    });

    return () => {
      video.removeEventListener("error", handleVideoError);
      video.removeEventListener("canplay", handleVideoCanPlay);
      video.removeEventListener("loadeddata", handleVideoLoadedData);
    };
  }, []);

  useEffect(() => {
    if (videoFailed) return;
    const fadeInterval = setInterval(() => {
      setIsVideoVisible((prev) => !prev);
    }, 20000);
    return () => clearInterval(fadeInterval);
  }, [videoFailed]);

  return (
    <div className="space-y-24 sm:space-y-32">
      <section aria-labelledby="hero-title" className="text-center hero rounded-none text-white relative overflow-hidden">
        {/* Background image layer */}
        <div 
          ref={imageRef}
          className={`hero-background-image ${isVideoVisible ? 'fade-out' : 'fade-in'}`}
        />
        
        {/* Background video */}
        <div className={`hero-video-wrapper ${isVideoVisible ? 'fade-in' : 'fade-out'}`}>
          <video 
            ref={videoRef}
            className="hero-video"
            autoPlay 
            loop 
            muted 
            playsInline
            preload="auto"
            aria-hidden="true"
          >
            <source src="/images/hero-video.mp4" type="video/mp4" />
          </video>
          <img 
            ref={gifRef}
            src="/images/hero-animation.gif" 
            alt="" 
            className="hero-video-fallback"
            aria-hidden="true"
          />
        </div>

        {/* Content overlay */}
        <div className="relative z-10 space-y-10 px-6 py-28 sm:py-36 lg:py-40">
          <h1 id="hero-title" className="text-7xl sm:text-8xl lg:text-9xl xl:text-[10rem] font-[family-name:var(--font-reggae-one)] heading-gradient text-balance leading-[0.9] drop-shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
            The Island
          </h1>
          <div className="space-y-5 max-w-4xl mx-auto">
            <p className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-semibold text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)] font-[family-name:var(--font-exo-2)]" style={{ fontWeight: 300 }}>
              <a 
                className="underline-offset-4 hover:underline transition-all hover:text-white hover:drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]" 
                href="https://wartfm.org" 
                target="_blank" 
                rel="noreferrer noopener"
              >
                WART 95.5 FM
              </a>
              <span className="mx-5 text-theme-gold text-3xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">•</span>
              <a 
                className="underline-offset-4 hover:underline transition-all hover:text-white hover:drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]" 
                href="https://madisoncountyarts.com/" 
                target="_blank" 
                rel="noreferrer noopener"
              >
                Madison County, NC
              </a>
            </p>
            <p className="text-lg sm:text-xl lg:text-2xl xl:text-3xl text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)] font-[family-name:var(--font-exo-2)]" style={{ fontWeight: 300 }}>
              DJ Dub Tractor — Fridays 6:30–8pm ET
            </p>
            <p className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-white/95 max-w-3xl mx-auto drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] font-[family-name:var(--font-island-moments)]">
              Cultivating positivity, unity, and community
            </p>
          </div>
          <div className="mt-14 flex flex-col sm:flex-row justify-center gap-6">
            <a 
              className="btn btn-live text-lg sm:text-xl px-12 py-6 rounded-full font-bold shadow-[0_4px_20px_rgba(220,38,38,0.5)] hover:shadow-[0_6px_30px_rgba(220,38,38,0.7)]" 
              href="https://station.voscast.com/5530050e0a38b/" 
              target="_blank" 
              rel="noreferrer noopener"
              aria-label="Listen to The Island live on WART 95.5 FM"
            >
              Listen Live
            </a>
            <a 
              className="btn btn-secondary text-lg sm:text-xl px-12 py-6 rounded-full font-bold shadow-[0_4px_20px_rgba(245,158,11,0.4)] hover:shadow-[0_6px_30px_rgba(245,158,11,0.6)]" 
              href="/recordings/"
              aria-label="Browse show archive"
            >
              Show Archive
            </a>
          </div>
        </div>
      </section>

      <div className="py-16 sm:py-24 relative z-10">
        <TracksThisWeek />
      </div>
    </div>
  );
}
