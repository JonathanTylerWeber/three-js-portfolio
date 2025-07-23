export default function LoadingScreen() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <img className="h-64 w-h-64" src="/images/ACLoading.png" alt="" />
      <div className="flex justify-center gap-3 z-50">
        <p className="text-3xl md:text-5xl xl:text-7xl font-fink text-white">
          Loading
        </p>
        <div className="mt-8 flex items-end space-x-2 -translate-y-1">
          <div className="size-2 md:size-3 animate-bounce rounded-full bg-white [animation-delay:-0.3s]" />
          <div className="size-2 md:size-3 animate-bounce rounded-full bg-white [animation-delay:-0.15s]" />
          <div className="size-2 md:size-3 animate-bounce rounded-full bg-white" />
        </div>
      </div>
    </div>
  );
}
