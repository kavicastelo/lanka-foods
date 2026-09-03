import React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export default function StarRating({ value = 0, size = 16, className, interactive = false, onChange }) {
    return (
        <div className={cn("flex items-center gap-0.5", className)}>
            {[1, 2, 3, 4, 5].map((n) => (
                <button
                    key={n}
                    type="button"
                    disabled={!interactive}
                    onClick={() => interactive && onChange?.(n)}
                    className={cn(interactive ? "cursor-pointer transition-transform hover:scale-110" : "cursor-default")}
                >
                    <Star
                        style={{ width: size, height: size }}
                        className={cn(
                            n <= Math.round(value) ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground/25"
                        )}
                    />
                </button>
            ))}
        </div>
    );
}