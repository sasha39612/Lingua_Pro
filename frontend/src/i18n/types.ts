import enMessages from '../../messages/en.json';

type Messages = typeof enMessages;

// Extend next-intl's IntlMessages type for full key autocomplete
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface IntlMessages extends Messages {}
