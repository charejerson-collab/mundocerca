import React from 'react';
import Card from './Card';
import Badge from './Badge';
import Button from './Button';

// City ID to Name mapping
const CITY_NAMES = {
  'tapachula': 'Tapachula, Chiapas',
  'cdmx': 'Ciudad de México',
  'guadalajara': 'Guadalajara, Jalisco',
  'monterrey': 'Monterrey, N.L.',
  'cancun': 'Cancún, Q. Roo'
};

export default function ListingCard({ listing, formatMXN, onDetails, compact = false }) {
  const cityName = CITY_NAMES[listing.city_id] || listing.city_id;
  
  return (
    <Card className={compact ? 'md:flex-row' : 'group'}>
      <div className={`overflow-hidden ${compact ? 'w-full' : ''}`}>
        <img src={listing.image} alt={listing.title} className={`w-full ${compact ? 'h-40' : 'h-48'} object-cover transition-transform duration-300 group-hover:scale-105`} />
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-semibold text-gray-900 line-clamp-1">{listing.title}</h4>
          <Badge variant="neutral" className="capitalize shrink-0">{listing.category}</Badge>
        </div>
        <div className="mt-2 text-sm text-gray-500 flex items-center gap-1">📍 {cityName}</div>
        <div className="mt-3 text-xl font-bold text-indigo-600">{formatMXN ? formatMXN(listing.price) : listing.price} <span className="text-sm font-normal text-gray-500">/mo</span></div>
        {!compact && <p className="mt-2 text-sm text-gray-700">{listing.description}</p>}

        <div className="mt-3 flex gap-2">
          <a href={`https://wa.me/${listing.whatsapp}`} target="_blank" rel="noreferrer" className="flex-1 text-center py-2 rounded bg-green-600 text-white hover:bg-green-700 transition-colors">WhatsApp</a>
          <Button variant="ghost" onClick={() => onDetails && onDetails(listing)} className="px-3 py-2">Details</Button>
        </div>
      </div>
    </Card>
  );
}
