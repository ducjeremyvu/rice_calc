<script lang="ts">
	import { onMount } from 'svelte';

	type MenuItem = {
		id: string;
		name: string;
		description: string;
		price: number;
		image: string;
		category: string;
	};

	type CartItem = {
		id: string;
		menuId: string;
		name: string;
		price: number;
		qty: number;
	};

	type Settings = {
		companyName: string;
		taxEnabled: boolean;
		taxRate: number;
		taxMode: 'preset' | 'custom';
		taxPreset: number;
		fee: number;
	};

	const storageKey = 'rice-calc-mvp-food-v1';

	const menuItems: MenuItem[] = [
		{
			id: 'chicken-box',
			name: 'Gà giòn hộp lớn',
			description: 'Gà rán giòn, sốt cay nhẹ, kèm rau trộn.',
			price: 89000,
			image: '/menu/chicken.svg',
			category: 'Gà rán'
		},
		{
			id: 'burger-classic',
			name: 'Burger bò cổ điển',
			description: 'Bò nướng, phô mai, rau tươi, sốt nhà làm.',
			price: 65000,
			image: '/menu/burger.svg',
			category: 'Burger'
		},
		{
			id: 'rice-bowl',
			name: 'Cơm gà sốt tiêu',
			description: 'Cơm nóng, gà áp chảo, sốt tiêu đen đậm vị.',
			price: 72000,
			image: '/menu/rice.svg',
			category: 'Cơm'
		},
		{
			id: 'fries-large',
			name: 'Khoai tây lắc phô mai',
			description: 'Khoai giòn, phủ bột phô mai mặn ngọt.',
			price: 39000,
			image: '/menu/fries.svg',
			category: 'Ăn kèm'
		},
		{
			id: 'combo-family',
			name: 'Combo gia đình',
			description: '2 gà giòn + 2 burger + khoai + nước ngọt.',
			price: 245000,
			image: '/menu/combo.svg',
			category: 'Combo'
		},
		{
			id: 'cola',
			name: 'Nước ngọt 330ml',
			description: 'Chai lạnh 330ml, chọn vị khi đặt.',
			price: 15000,
			image: '/menu/cola.svg',
			category: 'Đồ uống'
		}
	];

	let cart = $state<CartItem[]>([]);
	let selectedItem = $state<MenuItem | null>(null);
	let detailQty = $state(1);

	let settings = $state<Settings>({
		companyName: 'Bếp Giao Nhanh',
		taxEnabled: true,
		taxRate: 10,
		taxMode: 'preset',
		taxPreset: 10,
		fee: 15000
	});

	let today = $state('');
	let hydrated = $state(false);
	let copyState = $state<'idle' | 'copied' | 'error'>('idle');

	const currency = new Intl.NumberFormat('vi-VN', {
		style: 'currency',
		currency: 'VND'
	});

	const formatCurrency = (value: number) => currency.format(Number.isFinite(value) ? value : 0);

	const subtotal = $derived(
		cart.reduce((sum, item) => sum + item.price * (Number.isFinite(item.qty) ? item.qty : 0), 0)
	);
	const fee = $derived(Number.isFinite(settings.fee) ? settings.fee : 0);
	const activeTaxRate = $derived(
		settings.taxMode === 'custom' ? settings.taxRate : settings.taxPreset
	);
	const taxAmount = $derived(settings.taxEnabled ? (subtotal + fee) * (activeTaxRate / 100) : 0);
	const total = $derived(subtotal + fee + taxAmount);

	const openItem = (item: MenuItem) => {
		selectedItem = item;
		detailQty = 1;
	};

	const closeItem = () => {
		selectedItem = null;
		detailQty = 1;
	};

	const addToCart = () => {
		if (!selectedItem) return;
		const qty = Math.max(1, Math.floor(detailQty));
		const existing = cart.find((entry) => entry.menuId === selectedItem?.id);
		if (existing) {
			existing.qty += qty;
			cart = [...cart];
		} else {
			cart = [
				...cart,
				{
					id: crypto.randomUUID(),
					menuId: selectedItem.id,
					name: selectedItem.name,
					price: selectedItem.price,
					qty
				}
			];
		}
		closeItem();
	};

	const updateQty = (id: string, nextQty: number) => {
		if (!Number.isFinite(nextQty)) return;
		if (nextQty <= 0) {
			cart = cart.filter((item) => item.id !== id);
			return;
		}
		cart = cart.map((item) => (item.id === id ? { ...item, qty: nextQty } : item));
	};

	const removeFromCart = (id: string) => {
		cart = cart.filter((item) => item.id !== id);
	};

	const clearCart = () => {
		cart = [];
	};

	const buildSummary = () => {
		const date = today || new Date().toLocaleDateString('vi-VN');
		const header = `Báo giá - ${settings.companyName} (${date})`;

		const lineItems = cart.map((item) => {
			return `${item.name} x ${item.qty} = ${formatCurrency(item.price * item.qty)}`;
		});

		const extras: string[] = [];
		if (fee > 0) {
			extras.push(`Phí giao hàng: ${formatCurrency(fee)}`);
		}
		if (settings.taxEnabled) {
			extras.push(`VAT (${activeTaxRate}%): ${formatCurrency(taxAmount)}`);
		}

		return [header, '', ...lineItems, ...extras, '', `Tổng cộng: ${formatCurrency(total)}`].join('\n');
	};

	const copySummary = async () => {
		copyState = 'idle';
		try {
			const summary = buildSummary();
			if (navigator.clipboard?.writeText) {
				await navigator.clipboard.writeText(summary);
			} else {
				const textarea = document.createElement('textarea');
				textarea.value = summary;
				textarea.style.position = 'fixed';
				textarea.style.opacity = '0';
				document.body.appendChild(textarea);
				textarea.select();
				document.execCommand('copy');
				document.body.removeChild(textarea);
			}
			copyState = 'copied';
		} catch (error) {
			console.error(error);
			copyState = 'error';
		}
	};

	const printPdf = () => {
		window.print();
	};

	const loadState = () => {
		const raw = localStorage.getItem(storageKey);
		if (!raw) return;

		try {
			const parsed = JSON.parse(raw);
			if (Array.isArray(parsed?.cart)) {
				cart = parsed.cart.map((item: CartItem) => ({
					...item,
					id: item.id ?? crypto.randomUUID()
				}));
			}
			if (parsed?.settings) {
				settings = {
					...settings,
					...parsed.settings
				};
			}
		} catch (error) {
			console.error('Failed to load saved state', error);
		}
	};

	onMount(() => {
		today = new Date().toLocaleDateString('vi-VN');
		loadState();
		hydrated = true;
	});

	$effect(() => {
		if (!hydrated) return;
		localStorage.setItem(storageKey, JSON.stringify({ cart, settings }));
	});
</script>

<div class="no-print min-h-screen px-5 pb-16 pt-10 sm:px-10">
	<header class="mx-auto flex w-full max-w-6xl flex-col gap-6">
		<div class="flex flex-col gap-4">
			<p class="text-sm font-semibold uppercase tracking-[0.3em] text-sesame-500">
				Giao nhanh
			</p>
			<div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
				<div>
					<h1 class="font-display text-4xl font-semibold text-ink-900 sm:text-5xl">
						Fast food cho đơn giao hàng.
					</h1>
					<p class="mt-2 max-w-2xl text-base text-ink-700">
						Chọn món, xem chi tiết, thêm vào giỏ. In tạm tính khi cần.
					</p>
				</div>
				<div class="rounded-2xl border border-rice-200 bg-[color:var(--paper)] px-4 py-3 shadow-sm">
					<p class="text-xs uppercase tracking-[0.25em] text-sesame-500">Hôm nay</p>
					<p class="mt-1 text-lg font-semibold text-ink-900">{today}</p>
				</div>
			</div>
		</div>
	</header>

	<main class="mx-auto mt-10 grid w-full max-w-6xl gap-6 lg:grid-cols-[1.3fr_0.7fr]">
		<section class="rounded-3xl border border-rice-200 bg-[color:var(--paper)] p-6 shadow-lg">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 class="font-display text-2xl font-semibold text-ink-900">Menu hôm nay</h2>
					<p class="text-sm text-ink-700">Chạm vào món để xem chi tiết.</p>
				</div>
				<button
					class="rounded-full border border-rice-200 bg-white px-4 py-2 text-sm font-semibold text-ink-700 transition hover:border-sesame-400 hover:text-ink-900"
					type="button"
					onclick={clearCart}
				>
					Xóa giỏ hàng
				</button>
			</div>

			<div class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
				{#each menuItems as item (item.id)}
					<button
						class="group flex h-full flex-col overflow-hidden rounded-3xl border border-rice-200 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:border-sesame-400 hover:shadow-md"
						type="button"
						onclick={() => openItem(item)}
					>
						<div class="relative h-40 w-full bg-rice-100">
							<img
								class="h-full w-full object-cover"
								src={item.image}
								alt={item.name}
							/>
							<div class="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-ink-700">
								{item.category}
							</div>
						</div>
						<div class="flex flex-1 flex-col gap-2 p-4">
							<h3 class="text-lg font-semibold text-ink-900">{item.name}</h3>
							<p class="text-sm text-ink-700">{item.description}</p>
							<div class="mt-auto flex items-center justify-between">
								<span class="text-base font-semibold text-ink-900">
									{formatCurrency(item.price)}
								</span>
								<span class="text-xs font-semibold uppercase tracking-[0.2em] text-sesame-500">
									Xem món
								</span>
							</div>
						</div>
					</button>
				{/each}
			</div>
		</section>

		<section class="flex flex-col gap-5">
			<div class="rounded-3xl border border-rice-200 bg-[color:var(--paper)] p-6 shadow-lg">
				<h2 class="font-display text-2xl font-semibold text-ink-900">Giỏ hàng</h2>
				<p class="text-sm text-ink-700">Các món đã chọn sẽ xuất hiện ở đây.</p>

				<div class="mt-5 space-y-4">
					{#if cart.length === 0}
						<div class="rounded-2xl border border-dashed border-rice-200 bg-white px-4 py-6 text-center text-sm text-ink-700">
							Chưa có món nào. Chọn món bên trái để thêm vào giỏ.
						</div>
					{:else}
						<div class="space-y-3">
							{#each cart as entry (entry.id)}
								<div class="flex items-center justify-between gap-3 rounded-2xl border border-rice-200 bg-white px-4 py-3">
									<div>
										<p class="text-sm font-semibold text-ink-900">{entry.name}</p>
										<p class="text-xs text-ink-700">{formatCurrency(entry.price)}</p>
									</div>
									<div class="flex items-center gap-2">
										<button
											class="h-8 w-8 rounded-full border border-rice-200 text-base font-semibold text-ink-700"
											type="button"
											onclick={() => updateQty(entry.id, entry.qty - 1)}
										>
											-
										</button>
										<span class="min-w-[2.5rem] text-center text-sm font-semibold text-ink-900">
											{entry.qty}
										</span>
										<button
											class="h-8 w-8 rounded-full border border-rice-200 text-base font-semibold text-ink-700"
											type="button"
											onclick={() => updateQty(entry.id, entry.qty + 1)}
										>
											+
										</button>
									</div>
									<div class="text-right">
										<p class="text-sm font-semibold text-ink-900">
											{formatCurrency(entry.price * entry.qty)}
										</p>
										<button
											class="text-xs font-semibold text-chili-500"
											type="button"
											onclick={() => removeFromCart(entry.id)}
										>
											Xóa
										</button>
									</div>
								</div>
							{/each}
						</div>
					{/if}

					<div class="rounded-2xl border border-rice-200 bg-white px-4 py-4">
						<div class="flex items-center justify-between text-sm text-ink-700">
							<span>Tạm tính</span>
							<span class="font-semibold text-ink-900">{formatCurrency(subtotal)}</span>
						</div>
						<div class="mt-2 flex items-center justify-between text-sm text-ink-700">
							<span>Phí giao hàng</span>
							<span class="font-semibold text-ink-900">{formatCurrency(fee)}</span>
						</div>
						{#if settings.taxEnabled}
							<div class="mt-2 flex items-center justify-between text-sm text-ink-700">
								<span>VAT ({activeTaxRate}%)</span>
								<span class="font-semibold text-ink-900">{formatCurrency(taxAmount)}</span>
							</div>
						{/if}
						<div class="mt-4 flex items-center justify-between rounded-xl bg-rice-100 px-3 py-3 text-base font-semibold text-ink-900">
							<span>Tổng cộng</span>
							<span class="text-xl">{formatCurrency(total)}</span>
						</div>
					</div>

					<div class="flex flex-col gap-3">
						<button
							class="rounded-full bg-ink-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-ink-700"
							type="button"
							onclick={printPdf}
						>
							Xuất báo giá PDF
						</button>
						<button
							class="rounded-full border border-rice-200 bg-white px-4 py-3 text-sm font-semibold text-ink-900 shadow-sm transition hover:border-sesame-400"
							type="button"
							onclick={copySummary}
						>
							Sao chép tóm tắt
						</button>
						<p class="text-xs text-ink-700">
							{#if copyState === 'copied'}
								Đã sao chép vào bộ nhớ tạm.
							{:else if copyState === 'error'}
								Sao chép thất bại.
							{:else}
								Văn bản chia sẻ nhanh (WhatsApp).
							{/if}
						</p>
					</div>
				</div>
			</div>

			<div class="rounded-3xl border border-rice-200 bg-[color:var(--paper)] p-6 shadow-lg">
				<h2 class="font-display text-2xl font-semibold text-ink-900">Cài đặt</h2>
				<p class="text-sm text-ink-700">Thông tin hiển thị trên báo giá.</p>

				<div class="mt-5 space-y-4">
					<div>
						<label
							class="text-xs font-semibold uppercase tracking-[0.2em] text-sesame-500"
							for="company-name"
							>Tên cửa hàng</label
						>
						<input
							id="company-name"
							class="mt-2 w-full rounded-2xl border-rice-200 bg-white px-4 py-3 text-sm focus:border-sesame-500 focus:ring-sesame-500"
							placeholder="Bếp Giao Nhanh"
							bind:value={settings.companyName}
						/>
					</div>

					<div class="grid gap-3 sm:grid-cols-2">
						<div>
							<label
								class="text-xs font-semibold uppercase tracking-[0.2em] text-sesame-500"
								for="fixed-fee"
								>Phí giao hàng</label
							>
							<input
								id="fixed-fee"
								class="mt-2 w-full rounded-2xl border-rice-200 bg-white px-4 py-3 text-sm focus:border-sesame-500 focus:ring-sesame-500"
								type="number"
								min="0"
								step="1000"
								bind:value={settings.fee}
							/>
						</div>
						<div>
							<label
								class="text-xs font-semibold uppercase tracking-[0.2em] text-sesame-500"
								for="tax-rate"
								>Thuế VAT (%)</label
							>
							<select
								id="tax-rate"
								class="mt-2 w-full rounded-2xl border-rice-200 bg-white px-4 py-3 text-sm focus:border-sesame-500 focus:ring-sesame-500"
								value={settings.taxPreset}
								onchange={(event) =>
									(settings.taxPreset = Number((event.currentTarget as HTMLSelectElement).value))
								}
							>
								<option value={10}>10%</option>
								<option value={5}>5%</option>
								<option value={0}>0%</option>
							</select>
						</div>
					</div>

					<div class="flex items-center justify-between rounded-2xl border border-rice-200 bg-white px-4 py-3">
						<div>
							<p class="text-sm font-semibold text-ink-900">VAT tùy chỉnh</p>
							<p class="text-xs text-ink-700">Bật để nhập mức VAT riêng.</p>
						</div>
						<button
							class={`relative h-8 w-14 rounded-full border border-rice-200 transition ${
								settings.taxMode === 'custom' ? 'bg-sesame-500' : 'bg-rice-200'
							}`}
							type="button"
							role="switch"
							aria-checked={settings.taxMode === 'custom'}
							aria-label="VAT tùy chỉnh"
							onclick={() =>
								(settings.taxMode = settings.taxMode === 'custom' ? 'preset' : 'custom')
							}
						>
							<span
								class={`absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow transition ${
									settings.taxMode === 'custom' ? 'translate-x-6' : ''
								}`}
							></span>
						</button>
					</div>

					{#if settings.taxMode === 'custom'}
						<div>
							<label
								class="text-xs font-semibold uppercase tracking-[0.2em] text-sesame-500"
								for="tax-custom"
								>VAT tùy chỉnh (%)</label
							>
							<input
								id="tax-custom"
								class="mt-2 w-full rounded-2xl border-rice-200 bg-white px-4 py-3 text-sm focus:border-sesame-500 focus:ring-sesame-500"
								type="number"
								min="0"
								step="0.1"
								bind:value={settings.taxRate}
							/>
						</div>
					{/if}

					<div class="flex items-center justify-between rounded-2xl border border-rice-200 bg-white px-4 py-3">
						<div>
							<p class="text-sm font-semibold text-ink-900">Bật VAT</p>
							<p class="text-xs text-ink-700">Bật/tắt để tính VAT.</p>
						</div>
						<button
							class={`relative h-8 w-14 rounded-full border border-rice-200 transition ${
								settings.taxEnabled ? 'bg-sesame-500' : 'bg-rice-200'
							}`}
							type="button"
							role="switch"
							aria-checked={settings.taxEnabled}
							aria-label="Bật VAT"
							onclick={() => (settings.taxEnabled = !settings.taxEnabled)}
						>
							<span
								class={`absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow transition ${
									settings.taxEnabled ? 'translate-x-6' : ''
								}`}
							></span>
						</button>
					</div>
				</div>
			</div>
		</section>
	</main>
</div>

{#if selectedItem}
	<div class="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5 py-10">
		<div class="w-full max-w-2xl overflow-hidden rounded-3xl bg-[color:var(--paper)] shadow-2xl">
			<div class="grid gap-6 md:grid-cols-[1.1fr_1fr]">
				<div class="h-64 bg-rice-100 md:h-full">
					<img class="h-full w-full object-cover" src={selectedItem.image} alt={selectedItem.name} />
				</div>
				<div class="flex flex-col gap-4 p-6">
					<div>
						<p class="text-xs font-semibold uppercase tracking-[0.2em] text-sesame-500">
							{selectedItem.category}
						</p>
						<h3 class="mt-2 font-display text-2xl font-semibold text-ink-900">
							{selectedItem.name}
						</h3>
						<p class="mt-2 text-sm text-ink-700">{selectedItem.description}</p>
					</div>

					<div class="rounded-2xl border border-rice-200 bg-white px-4 py-3">
						<p class="text-xs uppercase tracking-[0.2em] text-sesame-500">Giá</p>
						<p class="mt-2 text-lg font-semibold text-ink-900">
							{formatCurrency(selectedItem.price)}
						</p>
					</div>

					<div class="flex items-center justify-between rounded-2xl border border-rice-200 bg-white px-4 py-3">
						<div>
							<p class="text-sm font-semibold text-ink-900">Số lượng</p>
							<p class="text-xs text-ink-700">Chọn số lượng muốn thêm.</p>
						</div>
						<div class="flex items-center gap-2">
							<button
								class="h-9 w-9 rounded-full border border-rice-200 text-base font-semibold text-ink-700"
								type="button"
								onclick={() => (detailQty = Math.max(1, detailQty - 1))}
							>
								-
							</button>
							<input
								class="w-16 rounded-xl border-rice-200 text-center text-sm tabular-nums"
								type="number"
								min="1"
								step="1"
								bind:value={detailQty}
							/>
							<button
								class="h-9 w-9 rounded-full border border-rice-200 text-base font-semibold text-ink-700"
								type="button"
								onclick={() => (detailQty = detailQty + 1)}
							>
								+
							</button>
						</div>
					</div>

					<div class="mt-auto flex flex-col gap-3">
						<button
							class="rounded-full bg-ink-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-ink-700"
							type="button"
							onclick={addToCart}
						>
							Thêm vào giỏ hàng
						</button>
						<button
							class="rounded-full border border-rice-200 bg-white px-4 py-3 text-sm font-semibold text-ink-900"
							type="button"
							onclick={closeItem}
						>
							Quay lại
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

<div class="print-only">
	<div class="mx-auto max-w-3xl px-10 py-12">
		<div class="flex items-start justify-between">
			<div>
				<p class="text-xs uppercase tracking-[0.3em] text-ink-700">Báo giá</p>
				<h1 class="mt-2 font-display text-3xl font-semibold text-ink-900">
					{settings.companyName}
				</h1>
				<p class="mt-2 text-sm text-ink-700">Đơn giao hàng fast food.</p>
			</div>
			<div class="text-right text-sm text-ink-700">
				<p>Ngày: {today}</p>
			</div>
		</div>

		<div class="mt-8 space-y-3">
			{#if cart.length === 0}
				<p class="text-sm text-ink-700">Chưa có món nào trong giỏ.</p>
			{:else}
				{#each cart as entry (entry.id)}
					<div class="flex items-start justify-between border-b border-rice-200 pb-2">
						<div>
							<p class="text-sm font-semibold text-ink-900">{entry.name}</p>
							<p class="text-xs text-ink-700">
								x {entry.qty} · {formatCurrency(entry.price)}
							</p>
						</div>
						<p class="text-sm font-semibold text-ink-900">
							{formatCurrency(entry.price * entry.qty)}
						</p>
					</div>
				{/each}
			{/if}
		</div>

		<div class="mt-8 w-full max-w-xs space-y-2 text-sm text-ink-700">
			<div class="flex items-center justify-between">
				<span>Tạm tính</span>
				<span class="font-semibold text-ink-900">{formatCurrency(subtotal)}</span>
			</div>
			<div class="flex items-center justify-between">
				<span>Phí giao hàng</span>
				<span class="font-semibold text-ink-900">{formatCurrency(fee)}</span>
			</div>
			{#if settings.taxEnabled}
				<div class="flex items-center justify-between">
					<span>VAT ({activeTaxRate}%)</span>
					<span class="font-semibold text-ink-900">{formatCurrency(taxAmount)}</span>
				</div>
			{/if}
			<div class="flex items-center justify-between rounded-xl bg-rice-100 px-3 py-3 text-base font-semibold text-ink-900">
				<span>Tổng cộng</span>
				<span>{formatCurrency(total)}</span>
			</div>
		</div>
	</div>
</div>
