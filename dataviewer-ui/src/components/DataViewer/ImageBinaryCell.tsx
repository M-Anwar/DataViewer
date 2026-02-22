import { useEffect, useMemo, useState } from "react";

interface ImageBinaryCellProps {
  value: unknown;
  alt: string;
}

function isByteNumber(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 255
  );
}

function toUint8Array(value: unknown): Uint8Array | null {
  if (value instanceof Uint8Array) {
    return value;
  }

  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }

  if (Array.isArray(value) && value.every(isByteNumber)) {
    return Uint8Array.from(value);
  }

  if (
    value !== null &&
    typeof value === "object" &&
    "data" in value &&
    Array.isArray((value as { data: unknown }).data)
  ) {
    const data = (value as { data: unknown[] }).data;
    if (data.every(isByteNumber)) {
      return Uint8Array.from(data);
    }
  }

  if (typeof value === "string") {
    const base64 = value.startsWith("data:")
      ? value.slice(value.indexOf(",") + 1)
      : value;
    try {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }
      return bytes;
    } catch {
      return null;
    }
  }

  return null;
}

function extractImageBytes(value: unknown): Uint8Array | null {
  const direct = toUint8Array(value);
  if (direct !== null) {
    return direct;
  }

  if (Array.isArray(value) && value.length > 0) {
    return toUint8Array(value[0]);
  }

  return null;
}

function getImageCount(value: unknown): number | null {
  if (!Array.isArray(value)) {
    return null;
  }

  if (value.length === 0) {
    return null;
  }

  if (value.every((item) => item instanceof Uint8Array)) {
    return value.length;
  }

  return null;
}

export function ImageBinaryCell({ value, alt }: ImageBinaryCellProps) {
  const [src, setSrc] = useState<string | null>(null);
  const imageBytes = useMemo(() => extractImageBytes(value), [value]);
  const imageCount = useMemo(() => getImageCount(value), [value]);

  useEffect(() => {
    if (imageBytes === null || imageBytes.length === 0) {
      setSrc(null);
      return;
    }

    const normalizedBytes = new Uint8Array(imageBytes.length);
    normalizedBytes.set(imageBytes);
    const blob = new Blob([normalizedBytes.buffer], {
      type: "application/octet-stream",
    });
    const objectUrl = URL.createObjectURL(blob);
    setSrc(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [imageBytes]);

  if (src === null) {
    return <span className="text-muted-foreground italic">No image</span>;
  }

  return (
    <div className="relative inline-block">
      {imageCount !== null ? (
        <span className="absolute right-1 top-1 rounded-full bg-black px-1.5 py-0.5 text-[10px] font-medium leading-none text-white">
          {imageCount}
        </span>
      ) : null}
      <img src={src} alt={alt} className="h-fit w-fit object-contain" />
    </div>
  );
}
