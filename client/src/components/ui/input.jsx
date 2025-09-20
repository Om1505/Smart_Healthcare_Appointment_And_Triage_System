import React from "react"

export const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  // Base styles for the input
  const baseStyles = "flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50";
  
  // Combine base styles with any extra classes passed in through props.
  const combinedStyles = `${baseStyles} ${className || ''}`;

  return (
    <input
      type={type}
      className={combinedStyles}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";