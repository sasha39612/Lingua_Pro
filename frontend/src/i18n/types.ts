import enMessages from '../../messages/en.json';

type Messages = typeof enMessages;

// Extend next-intl's IntlMessages type for full key autocomplete
interface IntlMessages extends Messages {}
