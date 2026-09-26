import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  containerClassName?: string;
}

function FieldWrapper({
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
  containerClassName,
}: FieldProps & { htmlFor: string; children: ReactNode }) {
  return (
    <div className={cn('w-full', containerClassName)}>
      {label && (
        <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="ml-0.5 text-rose-500">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p role="alert" className="mt-1.5 text-xs font-medium text-rose-600">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

export interface InputProps extends ComponentPropsWithRef<'input'>, FieldProps {
  leftIcon?: ReactNode;
}

export function Input({
  label,
  hint,
  error,
  required,
  containerClassName,
  className,
  leftIcon,
  id,
  ...props
}: InputProps) {
  const inputId = id ?? props.name ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <FieldWrapper
      label={label}
      hint={hint}
      error={error}
      required={required}
      htmlFor={inputId ?? 'input'}
      containerClassName={containerClassName}
    >
      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          aria-invalid={Boolean(error)}
          className={cn(
            'h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400',
            'transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100',
            'disabled:cursor-not-allowed disabled:bg-slate-50',
            leftIcon && 'pl-9',
            error && 'border-rose-400 focus:border-rose-500 focus:ring-rose-100',
            className,
          )}
          {...props}
        />
      </div>
    </FieldWrapper>
  );
}

export interface TextareaProps extends ComponentPropsWithRef<'textarea'>, FieldProps {}

export function Textarea({ label, hint, error, required, containerClassName, className, id, ...props }: TextareaProps) {
  const areaId = id ?? props.name ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <FieldWrapper
      label={label}
      hint={hint}
      error={error}
      required={required}
      htmlFor={areaId ?? 'textarea'}
      containerClassName={containerClassName}
    >
      <textarea
        id={areaId}
        aria-invalid={Boolean(error)}
        rows={props.rows ?? 4}
        className={cn(
          'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400',
          'transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100',
          error && 'border-rose-400 focus:border-rose-500 focus:ring-rose-100',
          className,
        )}
        {...props}
      />
    </FieldWrapper>
  );
}

export interface SelectProps extends ComponentPropsWithRef<'select'>, FieldProps {
  options: Array<{ label: string; value: string }>;
  placeholder?: string;
}

export function Select({
  label,
  hint,
  error,
  required,
  containerClassName,
  className,
  options,
  placeholder,
  id,
  ...props
}: SelectProps) {
  const selectId = id ?? props.name ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <FieldWrapper
      label={label}
      hint={hint}
      error={error}
      required={required}
      htmlFor={selectId ?? 'select'}
      containerClassName={containerClassName}
    >
      <select
        id={selectId}
        aria-invalid={Boolean(error)}
        className={cn(
          'h-10 w-full appearance-none rounded-md border border-slate-300 bg-white bg-[length:16px] bg-[right_10px_center] bg-no-repeat px-3 pr-9 text-sm text-slate-800',
          "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 stroke=%22%2364748b%22 stroke-width=%222%22 viewBox=%220 0 24 24%22><path d=%22M6 9l6 6 6-6%22/></svg>')]",
          'transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100',
          error && 'border-rose-400 focus:border-rose-500 focus:ring-rose-100',
          className,
        )}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  );
}

export interface CheckboxProps extends ComponentPropsWithRef<'input'> {
  label: string;
  description?: string;
}

export function Checkbox({ label, description, className, id, ...props }: CheckboxProps) {
  const checkboxId = id ?? props.name ?? label.toLowerCase().replace(/\s+/g, '-');
  return (
    <label
      htmlFor={checkboxId}
      className={cn('flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-slate-50', className)}
    >
      <input
        id={checkboxId}
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
        {...props}
      />
      <span className="text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        {description && <span className="block text-xs text-slate-500">{description}</span>}
      </span>
    </label>
  );
}
