import PickerSheet from '@/components/PickerSheet';
import { useAmbient } from '@/audio/AmbientContext';
import { genres, type Genre } from '@/content/music';
import { useT } from '@/i18n';

// Genre list opened by long-pressing the sound control. Picking one closes it and plays.
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
