export interface FavoritesProvider {
  readonly isAuthenticated: boolean
  isFavorite(id: string): boolean
  toggle(id: string): void
}
