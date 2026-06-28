import React from 'react';

export default function VideoDemo() {
  // Replace this URL with your Loom, YouTube, or MP4 video URL
  // We use a high quality project demonstration placeholder
  const videoUrl = 'https://www.youtube.com/embed/dQw4w9WgXcQ'; 

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      {/* Outer border & glassmorphism container matching premium aesthetics */}
      <div className="relative rounded-2xl overflow-hidden border border-mist dark:border-dusk-line shadow-card dark:shadow-card-dark bg-white dark:bg-dusk-raised p-2 transition-all duration-300 hover:border-signal/30">
        <div className="relative aspect-video rounded-xl overflow-hidden bg-ink/5 dark:bg-black/40">
          <iframe
            src={videoUrl}
            title="Project Demonstration Video"
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>

      {/* Indicator tag */}
      <div className="absolute -top-3 -right-3 px-3 py-1 rounded-full bg-signal text-white text-[10px] font-bold uppercase tracking-wider shadow-md">
        Demo Video
      </div>
    </div>
  );
}
