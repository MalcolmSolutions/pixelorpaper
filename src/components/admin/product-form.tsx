"use client";

import Image from "next/image";
import { useActionState, useRef, useState } from "react";
import {
  createProduct,
  updateProduct,
  type ProductFormState,
} from "@/app/admin/products/actions";
import { Field, inputClass } from "@/components/admin/field";
import { makePreview } from "@/components/admin/make-preview";
import { PRINT_SIZES, type PrintSizeName } from "@/lib/print-sizes";
import { formatPrice } from "@/lib/utils";

export type ProductFormValues = {
  name: string;
  description: string;
  categorySlug: string;
  location: string;
  keywords: string;
  prices: Record<PrintSizeName, number>;
};

const pounds = (pence: number) => (pence / 100).toFixed(2);

/**
 * Create or edit form for a product. Values are checked again on the
 * server; errors come back per field.
 */
export function ProductForm({
  mode,
  categories,
  values,
  slug,
  image,
}: {
  mode: "create" | "edit";
  categories: { slug: string; name: string }[];
  values: ProductFormValues;
  slug?: string;
  image?: { src: string; width: number; height: number };
}) {
  const [state, formAction, pending] = useActionState<
    ProductFormState,
    FormData
  >(mode === "create" ? createProduct : updateProduct, { status: "idle" });
  const errors = state.status === "error" ? state.errors : {};
  // After a rejected submit, refill with what was sent (React resets forms).
  const sent = state.status === "error" ? state.values : null;
  const value = (name: string, fallback: string) => sent?.[name] ?? fallback;
  // Remount after each response so refilled defaults take effect. File
  // inputs come back empty, so a chosen image only counts for this key.
  const formKey =
    state.status === "error" ? JSON.stringify(state.values) : state.status;

  // The chosen image's local preview and the web preview made from it.
  const previewInput = useRef<HTMLInputElement>(null);
  const [chosen, setChosen] = useState<{
    formKey: string;
    url: string;
    status: "working" | "ready" | "failed";
  } | null>(null);
  const current = chosen?.formKey === formKey ? chosen : null;
  const preview = current?.url ?? null;
  const waitingForPreview = mode === "create" && current?.status !== "ready";

  async function onImageChosen(file: File | undefined) {
    if (!file) {
      setChosen(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setChosen({ formKey, url, status: "working" });
    try {
      const blob = await makePreview(file);
      const transfer = new DataTransfer();
      transfer.items.add(
        new File([blob], "preview.jpg", { type: "image/jpeg" }),
      );
      if (previewInput.current) previewInput.current.files = transfer.files;
      setChosen({ formKey, url, status: "ready" });
    } catch {
      setChosen({ formKey, url, status: "failed" });
    }
  }

  return (
    <form
      key={formKey}
      action={formAction}
      className="grid gap-10 lg:grid-cols-12 lg:gap-16"
      noValidate
    >
      {slug && <input type="hidden" name="slug" value={slug} />}

      <div className="space-y-6 lg:col-span-5">
        {mode === "create" ? (
          <Field
            label="Image"
            name="image"
            hint="JPEG, PNG or WebP, at least 1,000 px on the longest side, up to 20 MB."
            error={errors.image}
            render={(props) => (
              <input
                {...props}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="block w-full text-sm file:mr-4 file:btn file:btn-outline file:btn-sm"
                onChange={(e) => onImageChosen(e.target.files?.[0])}
              />
            )}
          />
        ) : null}
        {mode === "create" && (
          <>
            {/* Filled in by onImageChosen; the server checks it. */}
            <input ref={previewInput} type="file" name="preview" hidden />
            <p role="status" className="text-xs text-ink-muted">
              {current?.status === "working" &&
                "Making the web preview the shop will show…"}
              {current?.status === "ready" &&
                "Web preview ready. The full-size file is kept private and sold as the download."}
              {current?.status === "failed" &&
                "This browser couldn't make a preview. Try another browser or image."}
            </p>
          </>
        )}
        {(preview || image) && (
          <div className="media-well flex aspect-[4/5] items-center justify-center">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- local preview of the chosen file
              <img
                src={preview}
                alt=""
                className="max-h-[78%] max-w-[80%] bg-white p-[2.5%] shadow-[0_10px_22px_-10px_rgb(0_0_0/0.4)]"
              />
            ) : (
              image && (
                <Image
                  src={image.src}
                  alt=""
                  width={image.width}
                  height={image.height}
                  sizes="(min-width: 64rem) 30vw, 90vw"
                  className="h-auto max-h-[78%] w-auto max-w-[80%] bg-white p-[2.5%] shadow-[0_10px_22px_-10px_rgb(0_0_0/0.4)]"
                />
              )
            )}
          </div>
        )}
      </div>

      <div className="space-y-6 lg:col-span-7">
        <Field
          label="Name"
          name="name"
          error={errors.name}
          render={(props) => (
            <input
              {...props}
              defaultValue={value("name", values.name)}
              maxLength={120}
              required
              className={inputClass}
            />
          )}
        />
        <Field
          label="Description"
          name="description"
          error={errors.description}
          render={(props) => (
            <textarea
              {...props}
              defaultValue={value("description", values.description)}
              maxLength={2000}
              rows={4}
              className={`${inputClass} py-3`}
            />
          )}
        />
        <div className="grid gap-6 sm:grid-cols-2">
          <Field
            label="Category"
            name="category"
            error={errors.categorySlug}
            render={(props) => (
              <select
                {...props}
                defaultValue={value("category", values.categorySlug)}
                required
                className={inputClass}
              >
                <option value="" disabled>
                  Choose…
                </option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          />
          <Field
            label="Location"
            name="location"
            hint="Optional, e.g. Lisbon, Portugal."
            error={errors.location}
            render={(props) => (
              <input
                {...props}
                defaultValue={value("location", values.location)}
                maxLength={120}
                className={inputClass}
              />
            )}
          />
        </div>
        <Field
          label="Keywords"
          name="keywords"
          hint="Optional, separated by commas."
          error={errors.keywords}
          render={(props) => (
            <input
              {...props}
              defaultValue={value("keywords", values.keywords)}
              className={inputClass}
            />
          )}
        />

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Prices (incl. VAT)</legend>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {PRINT_SIZES.map((size) => (
              <Field
                key={size.name}
                label={size.name}
                name={`price_${size.name}`}
                hint={`Standard ${formatPrice(size.standardPrice)}`}
                error={errors[`price_${size.name}`]}
                render={(props) => (
                  <div className="relative">
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-ink-muted"
                    >
                      £
                    </span>
                    <input
                      {...props}
                      inputMode="decimal"
                      defaultValue={value(
                        `price_${size.name}`,
                        pounds(values.prices[size.name]),
                      )}
                      required
                      className={`${inputClass} pl-8 tabular-nums`}
                    />
                  </div>
                )}
              />
            ))}
          </div>
        </fieldset>

        <div className="flex flex-wrap items-center gap-4 border-t pt-6">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={pending || waitingForPreview}
            aria-busy={pending || undefined}
          >
            {pending
              ? mode === "create"
                ? "Uploading…"
                : "Saving…"
              : mode === "create"
                ? "Create product"
                : "Save changes"}
          </button>
          <p role="status" className="text-sm">
            {state.status === "saved" && state.message}
            {state.status === "error" &&
              (errors.form ?? "Check the highlighted fields.")}
          </p>
        </div>
      </div>
    </form>
  );
}
