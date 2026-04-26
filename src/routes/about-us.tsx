import { createFileRoute } from "@tanstack/react-router";
import { LegalPageLayout } from "@/components/LegalPageLayout";

export const Route = createFileRoute("/about-us")({
  component: AboutUsPage,
});

function AboutUsPage() {
  const lifestyleImages = [
    {
      src: "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=1600&q=80",
      alt: "A woman relaxing on a sofa while using her phone.",
      caption: "Relax at home and complete movie tasks from your sofa.",
    },
    {
      src: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1600&q=80",
      alt: "Close-up of a person reviewing content on a mobile phone.",
      caption: "Review trailers and task orders quickly on your mobile screen.",
    },
    {
      src: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1600&q=80",
      alt: "A happy young man smiling at his phone.",
      caption: "Enjoy the moment when your completed tasks convert into earnings.",
    },
    {
      src: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1600&q=80",
      alt: "A person with coffee working on a laptop and phone.",
      caption: "Turn coffee breaks into productive earning sessions.",
    },
  ];

  return (
    <LegalPageLayout
      title="About Us"
      subtitle="CineTask helps movie lovers earn extra income in their free time or from home by completing simple movie tasks."
    >
      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">Turn Passion Into Profit</h2>
        <p>
          CineTask is designed for people who love movies and want a practical way to generate extra income. Our
          platform lets users complete movie-related tasks and orders from anywhere, including home, commutes, and spare
          moments throughout the day.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">Our Promise</h2>
        <p className="rounded-xl border border-border/70 bg-background/60 px-4 py-4 text-base md:text-lg text-foreground font-medium">
          Movie lovers can turn their passion into profit easily.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Daily Life With CineTask</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {lifestyleImages.map((image) => (
            <figure
              key={image.src}
              className="overflow-hidden rounded-2xl border border-border/70 bg-card/60 shadow-card-elegant"
            >
              <img
                src={image.src}
                alt={image.alt}
                loading="lazy"
                className="h-52 w-full object-cover md:h-64"
              />
              <figcaption className="px-4 py-3 text-sm text-muted-foreground">
                {image.caption}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">Why Users Choose Us</h2>
        <p>
          CineTask combines a clean user experience, fair task mechanics, and secure account operations to make earning
          straightforward and reliable. Whether you have ten minutes or an hour, you can progress through tasks at your
          own pace in a mobile-friendly workflow.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">Brand Commitment</h2>
        <p>
          We maintain professional standards for platform reliability, support, and security so users can earn with
          confidence.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          © Cinemas Limited 2019 CineTask. All rights reserved.
        </p>
      </section>
    </LegalPageLayout>
  );
}
