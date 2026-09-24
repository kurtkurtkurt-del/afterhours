import PickerSheet from '@/components/PickerSheet';
import { useAmbient } from '@/audio/AmbientContext';
import { genres, type Genre } from '@/content/music';

// ses düğmesine basılı tutunca açılan tür listesi. seçince kapanır ve çalar.
export default function GenrePicker() {
  const { pickerOpen, closePicker, genre, setGenre } = useAmbient();
  return (
    <PickerSheet
      open={pickerOpen}
      title="sound"
      options={genres}
      selected={genre}
      onSelect={(id) => setGenre(id as Genre)}
      onClose={closePicker}
      note="ten tracks each · plays while you browse"
    />
  );
}
