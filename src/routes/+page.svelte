<script lang="ts">
	import { onMount } from 'svelte';

	type Unit = 'cái' | 'kg' | 'thùng';
	type LineItem = {
		id: string;
		name: string;
		unit: Unit;
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

	const storageKey = 'rice-calc-mvp-v1';
	const unitOptions: Unit[] = ['cái', 'kg', 'thùng'];

	const createItem = (): LineItem => ({
		id: crypto.randomUUID(),
		name: '',
		unit: 'cái',
		price: 0,
		qty: 1
	});

	let items = $state<LineItem[]>([createItem()]);
	let settings = $state<Settings>({
		companyName: 'Cửa hàng gạo Nguyen',
		taxEnabled: true,
		taxRate: 7,
		taxMode: 'preset',
		taxPreset: 10,
		fee: 0
	});
	let today = $state('');
	let hydrated = $state(false);
	let copyState = $state<'idle' | 'copied' | 'error'>('idle');

	const currency = new Intl.NumberFormat('vi-VN', {
		style: 'currency',
		currency: 'VND'
	});

	const formatCurrency = (value: number) => currency.format(Number.isFinite(value) ? value : 0);

	const lineTotal = (item: LineItem) => {
		const price = Number.isFinite(item.price) ? item.price : 0;
		const qty = Number.isFinite(item.qty) ? item.qty : 0;
		return price * qty;
	};

	const subtotal = $derived(items.reduce((sum, item) => sum + lineTotal(item), 0));
	const fee = $derived(Number.isFinite(settings.fee) ? settings.fee : 0);
	const activeTaxRate = $derived(
		settings.taxMode === 'custom' ? settings.taxRate : settings.taxPreset
	);
	const taxAmount = $derived(settings.taxEnabled ? (subtotal + fee) * (activeTaxRate / 100) : 0);
	const total = $derived(subtotal + fee + taxAmount);

	const addItem = () => {
		items = [...items, createItem()];
	};

	const removeItem = (id: string) => {
		if (items.length === 1) {
			items = [createItem()];
			return;
		}
		items = items.filter((item) => item.id !== id);
	};

	const resetItems = () => {
		items = [createItem()];
	};

	const buildSummary = () => {
		const date = today || new Date().toLocaleDateString('de-DE');
		const header = `Báo giá - ${settings.companyName} (${date})`;

		const lineItems = items
			.filter((item) => item.name.trim().length > 0)
			.map((item) => {
				return `${item.name} - ${item.qty} ${item.unit} x ${formatCurrency(item.price)} = ${formatCurrency(
					lineTotal(item)
				)}`;
			});

		const extras: string[] = [];
		if (fee > 0) {
			extras.push(`Phí cố định: ${formatCurrency(fee)}`);
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
			if (Array.isArray(parsed?.items)) {
				items = parsed.items.map((item: LineItem) => ({
					...createItem(),
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
		today = new Date().toLocaleDateString('de-DE');
		loadState();
		hydrated = true;
	});

	$effect(() => {
		if (!hydrated) return;
		localStorage.setItem(storageKey, JSON.stringify({ items, settings }));
	});
</script>

<div class="no-print min-h-screen px-5 pb-16 pt-10 sm:px-10">
	<header class="mx-auto flex w-full max-w-6xl flex-col gap-6">
		<div class="flex flex-col gap-4">
			<p class="text-sm font-semibold uppercase tracking-[0.3em] text-sesame-500">
				Báo giá gạo
			</p>
			<div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
				<div>
					<h1 class="font-display text-4xl font-semibold text-ink-900 sm:text-5xl">
						Báo giá nhanh. Số liệu chuẩn.
					</h1>
					<p class="mt-2 max-w-2xl text-base text-ink-700">
						Nhập sản phẩm, xem tổng, gửi báo giá. Không cần đăng nhập.
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
					<h2 class="font-display text-2xl font-semibold text-ink-900">Sản phẩm</h2>
					<p class="text-sm text-ink-700">Đơn giản, rõ ràng, tính ngay.</p>
				</div>
				<div class="flex items-center gap-2">
					<button
						class="rounded-full border border-rice-200 bg-white px-4 py-2 text-sm font-semibold text-ink-700 transition hover:border-sesame-400 hover:text-ink-900"
						type="button"
						onclick={resetItems}
					>
						Xóa hết
					</button>
					<button
						class="rounded-full bg-sesame-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sesame-700"
						type="button"
						onclick={addItem}
					>
						+ Mục
					</button>
				</div>
			</div>

			<div class="mt-6 grid gap-4 text-xs font-semibold uppercase tracking-[0.2em] text-sesame-500 md:grid-cols-[2fr_1fr_1.4fr_0.9fr_1fr_auto]">
				<div>Sản phẩm</div>
				<div>Đơn vị</div>
				<div>Giá</div>
				<div>Số lượng</div>
				<div>Thành tiền</div>
				<div class="text-right">Thao tác</div>
			</div>

			<div class="mt-3 flex flex-col gap-3">
				{#each items as item (item.id)}
					<div
						class="grid items-center gap-3 rounded-2xl border border-rice-100 bg-white/70 px-3 py-3 shadow-sm md:grid-cols-[2fr_1fr_1.4fr_0.9fr_1fr_auto]"
					>
						<input
							class="w-full rounded-xl border-rice-200 bg-white px-3 py-2 text-sm focus:border-sesame-500 focus:ring-sesame-500"
							placeholder="Gạo thơm 5kg"
							bind:value={item.name}
						/>
						<select
							class="w-full rounded-xl border-rice-200 bg-white px-3 py-2 text-sm focus:border-sesame-500 focus:ring-sesame-500"
							bind:value={item.unit}
						>
							{#each unitOptions as option (option)}
								<option value={option}>{option}</option>
							{/each}
						</select>
						<input
							class="w-full rounded-xl border-rice-200 bg-white px-3 py-2 text-sm tabular-nums text-right focus:border-sesame-500 focus:ring-sesame-500"
							type="number"
							min="0"
							step="100"
							bind:value={item.price}
						/>
						<input
							class="w-full rounded-xl border-rice-200 bg-white px-3 py-2 text-sm focus:border-sesame-500 focus:ring-sesame-500"
							type="number"
							min="0"
							step="0.1"
							bind:value={item.qty}
						/>
						<div class="text-sm font-semibold text-ink-900">{formatCurrency(lineTotal(item))}</div>
						<div class="text-right">
							<button
								class="rounded-full border border-rice-200 bg-white px-3 py-1 text-xs font-semibold text-ink-700 transition hover:border-chili-500 hover:text-chili-500"
								type="button"
								onclick={() => removeItem(item.id)}
							>
								Xóa
							</button>
						</div>
					</div>
				{/each}
			</div>
		</section>

		<section class="flex flex-col gap-5">
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
							placeholder="Cửa hàng gạo Nguyen"
							bind:value={settings.companyName}
						/>
					</div>

					<div class="grid gap-3 sm:grid-cols-2">
						<div>
							<label
								class="text-xs font-semibold uppercase tracking-[0.2em] text-sesame-500"
								for="fixed-fee"
								>Phí cố định</label
							>
							<input
								id="fixed-fee"
								class="mt-2 w-full rounded-2xl border-rice-200 bg-white px-4 py-3 text-sm focus:border-sesame-500 focus:ring-sesame-500"
								type="number"
								min="0"
								step="0.01"
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

			<div class="rounded-3xl border border-rice-200 bg-[color:var(--paper)] p-6 shadow-lg">
				<h2 class="font-display text-2xl font-semibold text-ink-900">Tổng quan</h2>
				<p class="text-sm text-ink-700">Số liệu rõ ràng ngay lập tức.</p>

				<div class="mt-5 space-y-4">
					<div class="rounded-2xl border border-rice-200 bg-white px-4 py-4">
						<div class="flex items-center justify-between text-sm text-ink-700">
							<span>Tạm tính</span>
							<span class="font-semibold text-ink-900">{formatCurrency(subtotal)}</span>
						</div>
						<div class="mt-2 flex items-center justify-between text-sm text-ink-700">
							<span>Phụ phí</span>
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

					<div class="rounded-2xl border border-rice-200 bg-white px-4 py-4">
						<p class="text-xs font-semibold uppercase tracking-[0.2em] text-sesame-500">
							Danh sách
						</p>
						<div class="mt-3 space-y-3">
							{#if items.every((item) => item.name.trim().length === 0)}
								<p class="text-sm text-ink-700">Chưa có sản phẩm.</p>
							{:else}
								{#each items as item (item.id)}
									{#if item.name.trim().length > 0}
										<div class="flex items-start justify-between gap-3">
											<div>
												<p class="text-sm font-semibold text-ink-900">{item.name}</p>
												<p class="text-xs text-ink-700">
													{item.qty} {item.unit} x {formatCurrency(item.price)}
												</p>
											</div>
											<p class="text-sm font-semibold text-ink-900">
												{formatCurrency(lineTotal(item))}
											</p>
										</div>
									{/if}
								{/each}
							{/if}
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
		</section>
	</main>
</div>

<div class="print-only">
	<div class="mx-auto max-w-3xl px-10 py-12">
		<div class="flex items-start justify-between">
			<div>
				<p class="text-xs uppercase tracking-[0.3em] text-ink-700">Báo giá</p>
				<h1 class="mt-2 font-display text-3xl font-semibold text-ink-900">
					{settings.companyName}
				</h1>
				<p class="mt-2 text-sm text-ink-700">Sản phẩm gạo và giao hàng.</p>
			</div>
			<div class="text-right text-sm text-ink-700">
				<p>Ngày: {today}</p>
			</div>
		</div>

		<div class="mt-8 space-y-3">
			{#each items as item (item.id)}
				{#if item.name.trim().length > 0}
					<div class="flex items-start justify-between border-b border-rice-200 pb-2">
						<div>
							<p class="text-sm font-semibold text-ink-900">{item.name}</p>
							<p class="text-xs text-ink-700">
								{item.qty} {item.unit} x {formatCurrency(item.price)}
							</p>
						</div>
						<p class="text-sm font-semibold text-ink-900">{formatCurrency(lineTotal(item))}</p>
					</div>
				{/if}
			{/each}
		</div>

		<div class="mt-8 w-full max-w-xs space-y-2 text-sm text-ink-700">
			<div class="flex items-center justify-between">
				<span>Tạm tính</span>
				<span class="font-semibold text-ink-900">{formatCurrency(subtotal)}</span>
			</div>
			<div class="flex items-center justify-between">
				<span>Phụ phí</span>
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
