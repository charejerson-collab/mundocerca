import React from 'react';
import Card from './Card';
import Badge from './Badge';
import Button from './Button';
import { Check, Star, MapPin } from 'lucide-react';

// City ID to Name mapping
const CITY_NAMES = {
  'tapachula': 'Tapachula, Chiapas',
  'cdmx': 'Ciudad de México',
  'guadalajara': 'Guadalajara, Jalisco',
  'monterrey': 'Monterrey, N.L.',
  'cancun': 'Cancún, Q. Roo'
};

export default function ProfessionalCard({ pro, onView }) {
  const cityName = CITY_NAMES[pro.city_id] || pro.city_id;
  
  return (
    <Card className="p-5 group">
      <div className="flex gap-4 items-start">
        <img src={pro.image} alt={pro.name} className="w-24 h-24 object-cover rounded-xl ring-2 ring-gray-100 group-hover:ring-indigo-200 transition-all" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold">{pro.name}</h4>
            {pro.verified && <Badge variant="blue"><Check size={12} /> <span className="ml-1">Verified</span></Badge>}
          </div>
          <div className="text-sm text-gray-500">{pro.title}</div>
          <div className="mt-2 text-sm text-gray-700">{pro.description}</div>

          <div className="mt-3 flex items-center gap-3 text-sm text-gray-600">
            <MapPin size={14} /><span>{cityName}</span>
            <span className="mx-2">•</span>
            <Star size={14} className="text-yellow-500" /><span>{pro.rating} ({pro.reviews})</span>
          </div>

          <div className="mt-3 flex gap-2">
            <a href={`https://wa.me/${pro.whatsapp}`} target="_blank" rel="noreferrer" className="py-2 px-3 rounded bg-green-600 text-white hover:bg-green-700 transition-colors">WhatsApp</a>
            <Button variant="ghost" onClick={() => onView && onView(pro)}>View Profile</Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
