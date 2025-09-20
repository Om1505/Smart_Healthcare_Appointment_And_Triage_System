import React from "react";

export const Label = React.forwardRef(({ className, ...props }, ref) => {
  const baseStyles = "text-sm font-medium text-gray-700";
  const combinedStyles = `${baseStyles} ${className || ''}`;

  return (
    <label
      ref={ref}
      className={combinedStyles}
      {...props}
    />
  );
});
Label.displayName = "Label";