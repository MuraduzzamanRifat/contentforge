"use client";

import { ExternalLink, BarChart3 } from "lucide-react";

export function YouTubeEmbed({ youtubeId }: { youtubeId: string }) {
  return (
    <div className="space-y-2">
      <div className="aspect-video w-full overflow-hidden rounded-lg border border-border bg-black">
        <iframe
          className="h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
          title="Published video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      <div className="flex flex-wrap items-center gap-3 text-[11px]">
        <a
          href={`https://youtube.com/watch?v=${youtubeId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          Watch on YouTube <ExternalLink className="h-3 w-3" />
        </a>
        <a
          href={`https://studio.youtube.com/video/${youtubeId}/analytics/tab-overview/period-default`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline"
        >
          <BarChart3 className="h-3 w-3" /> Traffic analysis (YouTube Studio)
        </a>
      </div>
    </div>
  );
}
