export default function Footer() {
  return (
    <footer className="bg-primary-dark border-t border-gray-800 p-4 text-sm text-gray-400 text-center">
      <div className="mb-2">
        <a href="#" className="hover:text-white mr-4">Terms of Service</a>
        <a href="#" className="hover:text-white mr-4">Privacy Policy</a>
        <a href="#" className="hover:text-white mr-4">Responsible Gaming</a>
        <a href="#" className="hover:text-white">Contact Support</a>
      </div>
      <div>
        &copy; {new Date().getFullYear()} CryptoPlay Casino. All games are provably fair.
      </div>
    </footer>
  );
}
