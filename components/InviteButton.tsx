'use client';

export function InviteButton({ familyId }: { familyId: string }) {
  const copyLink = () => {
    const link = `${window.location.origin}/join/${familyId}`;
    navigator.clipboard.writeText(link);
    alert("Invite link copied! Send this to your family.");
  };

  return (
    <button 
      onClick={copyLink}
      className="text-[10px] font-bold text-blue-500 uppercase border border-blue-100 dark:border-blue-900 px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
    >
      Invite
    </button>
  );
}