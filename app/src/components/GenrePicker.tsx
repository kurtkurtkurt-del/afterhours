import PickerSheet from '@/components/PickerSheet';
import { useAmbient } from '@/audio/AmbientContext';
import { genres, type Genre } from '@/content/music';
import { useT } from '@/i18n';

// ses düğmesine basılı tutunca açılan tür listesi. seçince kapanır ve çalar.
export default function GenrePicker() {
  const { pickerOpen, closePicker, genre, setGenre } = useAmbient();
  const t = useT();
  return (
    <PickerSheet
      open={pickerOpen}
      title={t('sound.title')}
      options={genres}
      selected={genre}
      onSelect={(id) => setGenre(id as Genre)}
      onClose={closePicker}
      note={t('sound.note')}
    />
  );
}
