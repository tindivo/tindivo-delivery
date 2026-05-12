'use client'
import type { MenuCategoryRow, MenuItemRow } from '@tindivo/api-client'
import { Button, GlassTopBar, Icon, IconButton, Skeleton } from '@tindivo/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useMenuTree } from '../hooks/use-menu'
import { CategoryFormSheet } from './category-form-sheet'
import { ItemFormSheet } from './item-form-sheet'

/**
 * Editor de catálogo del restaurante. Muestra categorías colapsables
 * con sus items. Botón flotante "+ Producto" abre sheet para crear/editar.
 *
 * Diseño compacto: una sola página vertical con secciones por categoría.
 * Crear/editar categoría e items via bottom sheets — el flujo de
 * modificadores se hace dentro del sheet de item (anidado).
 */
export function MenuEditor() {
  const router = useRouter()
  const { data, isLoading } = useMenuTree()
  const [categorySheetOpen, setCategorySheetOpen] = useState<{
    category: MenuCategoryRow | null
  } | null>(null)
  const [itemSheetOpen, setItemSheetOpen] = useState<{ item: MenuItemRow | null } | null>(null)

  const itemsByCategory = new Map<string | null, MenuItemRow[]>()
  for (const item of data?.items ?? []) {
    const key = item.category_id
    const list = itemsByCategory.get(key) ?? []
    list.push(item)
    itemsByCategory.set(key, list)
  }

  return (
    <div className="min-h-screen pb-32">
      <GlassTopBar
        title="MI NEGOCIO"
        subtitle="Catálogo"
        left={
          <IconButton
            variant="ghost"
            onClick={() => router.push('/restaurante')}
            aria-label="Volver"
          >
            <Icon name="arrow_back" />
          </IconButton>
        }
        right={
          <button
            type="button"
            onClick={() => setCategorySheetOpen({ category: null })}
            className="inline-flex items-center gap-1.5 px-3 h-10 rounded-full bg-surface-container-lowest border border-outline-variant/30 text-sm font-bold text-on-surface"
          >
            <Icon name="add" size={16} />
            Categoría
          </button>
        }
      />

      <main className="pt-24 px-4 max-w-md mx-auto space-y-5">
        {isLoading ? (
          <>
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </>
        ) : (data?.categories?.length ?? 0) === 0 ? (
          <div className="rounded-2xl bg-surface-container-lowest border border-dashed border-outline-variant/40 p-8 text-center space-y-3">
            <Icon name="restaurant_menu" size={48} className="text-on-surface-variant/40 mx-auto" />
            <p className="text-on-surface-variant">Aún no tienes categorías ni productos.</p>
            <Button onClick={() => setCategorySheetOpen({ category: null })}>
              <Icon name="add" />
              Crear primera categoría
            </Button>
          </div>
        ) : (
          (data?.categories ?? []).map((category) => (
            <section
              key={category.id}
              className="rounded-2xl bg-surface-container-lowest border border-outline-variant/15 overflow-hidden"
            >
              <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-outline-variant/10">
                <div className="min-w-0 flex-1">
                  <h2 className="font-black text-on-surface truncate">{category.name}</h2>
                  {category.description && (
                    <p className="text-xs text-on-surface-variant truncate">
                      {category.description}
                    </p>
                  )}
                </div>
                {!category.is_active && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold uppercase tracking-wide">
                    Oculta
                  </span>
                )}
                <IconButton
                  variant="ghost"
                  onClick={() => setCategorySheetOpen({ category })}
                  aria-label="Editar categoría"
                >
                  <Icon name="edit" size={18} />
                </IconButton>
              </header>

              <ul className="divide-y divide-outline-variant/10">
                {(itemsByCategory.get(category.id) ?? []).map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setItemSheetOpen({ item })}
                      className="w-full flex items-center gap-3 p-3 hover:bg-surface-container/40 transition-colors text-left"
                    >
                      <span className="flex-shrink-0 w-12 h-12 rounded-xl bg-surface-container overflow-hidden flex items-center justify-center">
                        {item.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Icon
                            name="restaurant"
                            size={20}
                            className="text-on-surface-variant/50"
                          />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-on-surface truncate">{item.name}</p>
                        <p className="text-xs text-on-surface-variant tabular-nums">
                          S/ {Number(item.price).toFixed(2)}
                          {!item.is_available && (
                            <span className="ml-2 text-amber-700 font-bold">No disponible</span>
                          )}
                        </p>
                      </div>
                      <Icon name="chevron_right" size={18} className="text-on-surface-variant/50" />
                    </button>
                  </li>
                ))}
                <li className="p-3">
                  <button
                    type="button"
                    onClick={() =>
                      setItemSheetOpen({ item: { category_id: category.id } as MenuItemRow })
                    }
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-outline-variant/40 text-sm font-bold text-primary-container"
                  >
                    <Icon name="add" size={16} />
                    Agregar producto
                  </button>
                </li>
              </ul>
            </section>
          ))
        )}

        {/* Items sin categoría */}
        {(itemsByCategory.get(null)?.length ?? 0) > 0 && (
          <section className="rounded-2xl bg-surface-container-lowest border border-outline-variant/15 p-4 space-y-2">
            <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase text-on-surface-variant">
              Sin categoría
            </h3>
            <ul className="space-y-2">
              {itemsByCategory.get(null)?.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setItemSheetOpen({ item })}
                    className="w-full flex items-center gap-3 p-2 hover:bg-surface-container/40 rounded-xl text-left"
                  >
                    <p className="font-bold text-on-surface truncate flex-1">{item.name}</p>
                    <p className="text-xs tabular-nums">S/ {Number(item.price).toFixed(2)}</p>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      {categorySheetOpen && (
        <CategoryFormSheet
          category={categorySheetOpen.category}
          onClose={() => setCategorySheetOpen(null)}
        />
      )}
      {itemSheetOpen && (
        <ItemFormSheet
          item={itemSheetOpen.item}
          categories={data?.categories ?? []}
          groups={data?.groups ?? []}
          options={data?.options ?? []}
          onClose={() => setItemSheetOpen(null)}
        />
      )}
    </div>
  )
}
